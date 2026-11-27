"use client";

import { useMemo, useState } from "react";
import { Trash2, AlertTriangle, X, Search } from "lucide-react";
import { toast } from "sonner";
import DateRangeField from "@/components/quotes/DateRangeField";
import {
    COMPANY_DISCOUNT_LABEL, MANUAL_DISCOUNT_LABEL, MAX_NIGHTS_PER_LINE, OCCUPANCIES, OCCUPANCY_LABELS, addDays, calculateQuote, discountLabel, formatDateDMY, ivaRateFromNet, withTableIva,
    describeDates, effectiveDates, normalizePassengers, passengersError, normalizeDiscountType, periodFromDates, rangeDates, recurringDates, validateDates, weekdayOf,
    type DiscountMode, type DiscountType, type Occupancy, type RateTable,
} from "@/lib/quotes/calc";
import type { QuoteRow } from "@/lib/quotes/service";

export type FormCompany = {
    id: number; name: string; rut: string | null; contact_name: string | null; contact_email: string | null;
    discount_type: DiscountType | null; discount_value: number | null; is_active: boolean;
};
export type FormSettings = { validity_days: number; validity_provisional: boolean; default_conditions: string };

/**
 * Línea de habitaciones. `dates` (una fecha por noche) es la fuente de verdad; los controles de
 * «Rango» y «Recurrente» solo la regeneran cuando el usuario los cambia (así editar no altera fechas guardadas).
 */
type FormLine = {
    occupancy: Occupancy; rooms: string; rate: string; // rate "" -> usa la tabla (se lee como valor con IVA)
    rateMode: "neto" | "con_iva";                      // cómo se interpreta `rate` cuando se escribe a mano
    mode: "rango" | "recurrente";
    rStart: string; rEnd: string;                      // modo Rango: entrada y salida de la línea
    weekdays: number[]; from: string; to: string;      // modo Recurrente (0 = domingo)
    dates: string[];
    passengers: string;                                // un pasajero (o pareja separada con /) por renglón
};

const WEEKDAY_BUTTONS: { n: number; label: string; title: string }[] = [
    { n: 1, label: "L", title: "Lunes" }, { n: 2, label: "M", title: "Martes" }, { n: 3, label: "X", title: "Miércoles" },
    { n: 4, label: "J", title: "Jueves" }, { n: 5, label: "V", title: "Viernes" }, { n: 6, label: "S", title: "Sábado" }, { n: 0, label: "D", title: "Domingo" },
];

const blankLine = (rangeStart = "", rangeEnd = ""): FormLine => ({
    occupancy: "doble", rooms: "1", rate: "", rateMode: "neto", mode: "rango", rStart: rangeStart, rEnd: rangeEnd,
    weekdays: [], from: "", to: "", dates: rangeDates(rangeStart, rangeEnd), passengers: "",
});

/** Línea guardada -> estado del formulario. Líneas antiguas (sin dates) usan el rango de la cotización. */
function lineFromRow(l: QuoteRow["lines"][number], q: QuoteRow): FormLine {
    const dates = effectiveDates(l, q.check_in, q.check_out);
    const first = dates[0] ?? "", last = dates[dates.length - 1] ?? "";
    const contiguous = dates.length > 0 && dates.length === rangeDates(first, addDays(last, 1)).length;
    return {
        occupancy: l.occupancy, rooms: String(l.rooms), rate: l.rate_with_iva ? String(l.rate_with_iva) : l.rate_override ? String(l.rate_override) : "",
        rateMode: l.rate_with_iva ? "con_iva" : "neto",
        mode: contiguous || dates.length === 0 ? "rango" : "recurrente",
        rStart: first, rEnd: first ? addDays(last, 1) : "",
        weekdays: Array.from(new Set(dates.map(weekdayOf))), from: first, to: last, dates,
        passengers: normalizePassengers(l.passengers).join("\n"),
    };
}

const money = (n: number) => "$" + n.toLocaleString("es-CL");

type Init = { mode: DiscountMode; type: "porcentaje" | "monto_fijo"; value: string; reason: string };

/** Modo inicial al editar/duplicar: coincide con el convenio de la empresa, o es manual. */
function initialDiscount(q: QuoteRow | null, companies: FormCompany[]): Init {
    const none: Init = { mode: "ninguno", type: "porcentaje", value: "", reason: "" };
    if (!q) return none;
    const type = normalizeDiscountType(q.discount_type);
    if (type === "ninguno" || !(Number(q.discount_value) > 0)) return none;
    const c = companies.find((x) => x.id === q.company_id);
    const label = q.discount_label?.trim() || null;
    const matchesCompany = !!c && normalizeDiscountType(c.discount_type) === type && Number(c.discount_value) === Number(q.discount_value)
        && (!label || label === COMPANY_DISCOUNT_LABEL);
    if (matchesCompany) return { ...none, mode: "empresa" };
    const reason = label && label !== MANUAL_DISCOUNT_LABEL && label !== COMPANY_DISCOUNT_LABEL ? label : "";
    return { mode: "manual", type, value: String(q.discount_value), reason };
}

/** Misma regla que el servidor: porcentaje 0-100; monto fijo 0-neto bruto. */
function manualDiscountError(type: "porcentaje" | "monto_fijo", value: string, gross: number): string | null {
    if (value.trim() === "") return null;
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0) return "El valor del descuento no es válido.";
    if (type === "porcentaje" && v > 100) return "El porcentaje debe estar entre 0 y 100.";
    if (type === "monto_fijo" && v > gross) return "El monto no puede superar el neto bruto de la cotización.";
    return null;
}

function effectiveDiscount(mode: DiscountMode, company: FormCompany | undefined, type: "porcentaje" | "monto_fijo", value: string, reason: string) {
    if (mode === "empresa" && company) return { type: normalizeDiscountType(company.discount_type), value: Number(company.discount_value) || 0, label: COMPANY_DISCOUNT_LABEL };
    if (mode === "manual") return { type: type as DiscountType, value: Number(value) || 0, label: reason.trim() || MANUAL_DISCOUNT_LABEL };
    return { type: "ninguno" as DiscountType, value: 0, label: null as string | null };
}
const input = "px-2 py-2 border border-slate-300 rounded-md text-sm w-full";

/**
 * Formulario de cotización.
 * - mode "create": nueva (también para «Duplicar»: se pasa `quote` como datos precargados).
 * - mode "edit": edita `quote` (solo borradores) con PUT.
 */
export default function QuoteForm({
    mode, quote, companies, rates, settings, onClose, onSaved,
}: {
    mode: "create" | "edit"; quote?: QuoteRow | null; companies: FormCompany[]; rates: RateTable; settings: FormSettings;
    onClose: () => void; onSaved: () => void;
}) {
    const q = quote ?? null;
    const [companyId, setCompanyId] = useState(q?.company_id ? String(q.company_id) : "");
    const [companyName, setCompanyName] = useState(q?.company_name ?? "");
    // Buscador de empresa registrada: texto que ve el usuario (se sincroniza al elegir una empresa de la lista).
    const [companySearch, setCompanySearch] = useState(
        q?.company_id ? companies.find((c) => String(c.id) === String(q.company_id))?.name ?? "" : ""
    );
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [rut, setRut] = useState(q?.company_rut ?? "");
    const [contact, setContact] = useState(q?.contact_name ?? "");
    const [email, setEmail] = useState(q?.contact_email ?? "");
    // Calendario general: OPCIONAL. Si se usa, rellena las líneas que aún no tienen fechas y las líneas nuevas.
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [showCalendar, setShowCalendar] = useState(false);
    const [lines, setLines] = useState<FormLine[]>(
        q?.lines?.length ? q.lines.map((l) => lineFromRow(l, q)) : [blankLine()]
    );
    const [validity, setValidity] = useState(String(q?.validity_days ?? settings.validity_days));
    const [conditions, setConditions] = useState(q?.conditions ?? settings.default_conditions);
    const [saving, setSaving] = useState(false);

    const company = companies.find((c) => String(c.id) === companyId);
    const companyHasDiscount = !!company && normalizeDiscountType(company.discount_type) !== "ninguno" && Number(company.discount_value) > 0;

    // ---- Descuento: «Sin descuento» / «De la empresa» / «Manual» ----
    const init = initialDiscount(q, companies);
    const [discMode, setDiscMode] = useState<DiscountMode>(init.mode);
    const [manType, setManType] = useState<"porcentaje" | "monto_fijo">(init.type);
    const [manValue, setManValue] = useState(init.value);
    const [manReason, setManReason] = useState(init.reason);

    const effMode: DiscountMode = discMode === "empresa" && !companyHasDiscount ? "ninguno" : discMode;
    const eff = effectiveDiscount(effMode, company, manType, manValue, manReason);

    const rateFields = (l: FormLine) => (l.rate === "" ? { rate_override: null } : l.rateMode === "con_iva" ? { rate_override: null, rate_with_iva: Number(l.rate) } : { rate_override: Number(l.rate) });
    const rawLines = withTableIva(lines.map((l) => ({ occupancy: l.occupancy, rooms: Number(l.rooms), nights: l.dates.length, dates: l.dates, ...rateFields(l) })), rates);
    const gross = useMemo(() => calculateQuote({ lines: rawLines, rates }).gross, [lines, rates]); // eslint-disable-line react-hooks/exhaustive-deps
    const discountError = effMode === "manual" ? manualDiscountError(manType, manValue, gross) : null;

    const calc = useMemo(() => calculateQuote({
        lines: rawLines, rates,
        discount_type: discountError ? "ninguno" : eff.type,
        discount_value: discountError ? 0 : eff.value,
    }), [lines, rates, eff.type, eff.value, discountError]); // eslint-disable-line react-hooks/exhaustive-deps

    const onCompany = (id: string) => {
        setCompanyId(id);
        const c = companies.find((x) => String(x.id) === id);
        if (c) { setCompanyName(c.name); setRut(c.rut ?? ""); setContact(c.contact_name ?? ""); setEmail(c.contact_email ?? ""); setCompanySearch(c.name); }
        // Por defecto: «De la empresa» si tiene descuento; si no, «Sin descuento» (el modo manual se respeta).
        const has = !!c && normalizeDiscountType(c.discount_type) !== "ninguno" && Number(c.discount_value) > 0;
        if (discMode !== "manual") setDiscMode(has ? "empresa" : "ninguno");
    };
    const clearCompany = () => { setCompanyId(""); setCompanySearch(""); };
    // Lista de empresas registradas (activas, más la actual aunque no lo esté) filtrada por lo escrito en el buscador.
    const filteredCompanies = useMemo(() => {
        const base = companies.filter((c) => c.is_active || String(c.id) === companyId);
        const lower = companySearch.trim().toLowerCase();
        const list = lower
            ? base.filter((c) => c.name.toLowerCase().includes(lower) || (c.rut && c.rut.toLowerCase().includes(lower)))
            : base;
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }, [companies, companySearch, companyId]);
    const setLine = (i: number, patch: Partial<FormLine>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));

    // Cambios en los controles de fechas de una línea: regeneran `dates`.
    const setRange = (i: number, rStart: string, rEnd: string) => setLine(i, { mode: "rango", rStart, rEnd, dates: rangeDates(rStart, rEnd) });
    const setRecurring = (i: number, patch: Partial<Pick<FormLine, "weekdays" | "from" | "to">>) => {
        const l = lines[i];
        const next = { weekdays: l.weekdays, from: l.from, to: l.to, ...patch };
        setLine(i, { mode: "recurrente", ...next, dates: recurringDates(next.from, next.to, next.weekdays) });
    };
    const toggleWeekday = (i: number, n: number) => {
        const w = lines[i].weekdays;
        setRecurring(i, { weekdays: w.includes(n) ? w.filter((x) => x !== n) : [...w, n] });
    };
    const setLineMode = (i: number, mode: "rango" | "recurrente") => {
        const l = lines[i];
        // al cambiar de modo se regenera desde los datos de ese modo (si los hay); si no, se conservan las fechas actuales
        if (mode === "rango" && l.rStart && l.rEnd) setRange(i, l.rStart, l.rEnd);
        else if (mode === "recurrente" && l.from && l.to && l.weekdays.length) setRecurring(i, {});
        else setLine(i, { mode });
    };
    // Calendario general (opcional): rellena las líneas sin fechas
    const onGeneralRange = (s: string, e: string) => {
        setStart(s); setEnd(e);
        if (s && e) setLines(lines.map((l) => (l.dates.length === 0 ? { ...l, mode: "rango", rStart: s, rEnd: e, dates: rangeDates(s, e) } : l)));
    };
    const lineErrors = lines.map((l) => (l.dates.length === 0 ? "Elige las fechas de esta línea." : validateDates(l.dates)));
    const hasLineErrors = lineErrors.some(Boolean);

    const submit = async (andSend: boolean) => {
        if (andSend && !email.trim()) return toast.error("Ingresa el correo del contacto para enviar.");
        if (calc.has_missing_rates) return toast.error("Hay líneas con «tarifa sin cargar»: escribe la tarifa a mano.");
        if (discountError) return toast.error(discountError);
        if (hasLineErrors) return toast.error(lineErrors.find(Boolean)!);
        setSaving(true);
        try {
            const editing = mode === "edit" && q;
            const res = await fetch(editing ? `/api/quotes/${q!.id}` : "/api/quotes", {
                method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_id: company?.id ?? null, company_name: companyName, company_rut: rut, contact_name: contact, contact_email: email,
                    ...(periodFromDates(lines.flatMap((l) => l.dates)) ?? { check_in: "", check_out: "" }), validity_days: Number(validity), conditions,
                    discount_mode: effMode, discount_type: manType, discount_value: Number(manValue) || 0, discount_reason: manReason,
                    lines: lines.map((l) => ({ occupancy: l.occupancy, rooms: Number(l.rooms), dates: l.dates, ...rateFields(l), passengers: l.passengers.split("\n") })),
                }),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error);
            if (andSend) {
                const s = await (await fetch(`/api/quotes/${json.data.id}/send`, { method: "POST" })).json();
                if (!s.ok) throw new Error(`Cotización guardada como borrador, pero el envío falló: ${s.error}`);
                if (s.simulated) toast.warning("EL CORREO NO SALIÓ: el sistema está en modo simulado. La cotización quedó como borrador.", { duration: 15000 });
                else toast.success("Cotización enviada.");
            } else {
                toast.success(editing ? "Cambios guardados." : "Borrador guardado.");
            }
            onSaved();
        } catch (e: any) {
            toast.error(e.message || "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const title = mode === "edit" ? `Editar cotización` : q ? "Duplicar como nueva cotización" : "Nueva cotización";

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-6">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="font-semibold text-slate-800">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>

                <div className="p-5 space-y-5">
                    <section className="grid md:grid-cols-2 gap-3">
                        <div className="relative">
                            <label className="text-xs text-slate-500">Empresa registrada (opcional)</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 text-slate-400" size={15} />
                                <input
                                    type="text"
                                    value={companySearch}
                                    onChange={(e) => {
                                        setCompanySearch(e.target.value);
                                        setIsCompanyDropdownOpen(true);
                                        if (companyId) setCompanyId("");
                                    }}
                                    onFocus={() => setIsCompanyDropdownOpen(true)}
                                    placeholder="Buscar empresa por nombre o RUT..."
                                    className={`${input} pl-8 ${companyId ? "border-emerald-400 bg-emerald-50" : ""}`}
                                />
                                {companyId && (
                                    <button
                                        type="button"
                                        onClick={clearCompany}
                                        className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-red-500"
                                        title="Quitar empresa"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            {isCompanyDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsCompanyDropdownOpen(false)} />
                                    <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 z-20 max-h-60 overflow-auto">
                                        {filteredCompanies.length > 0 ? (
                                            filteredCompanies.map((c) => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => { onCompany(String(c.id)); setIsCompanyDropdownOpen(false); }}
                                                    className="p-2.5 hover:bg-emerald-50 cursor-pointer text-sm border-b border-slate-100 last:border-0"
                                                >
                                                    {c.name}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-slate-400 text-sm">No se encontraron empresas</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <div><label className="text-xs text-slate-500">Nombre empresa *</label><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={input} /></div>
                        <div><label className="text-xs text-slate-500">RUT</label><input value={rut} onChange={(e) => setRut(e.target.value)} className={input} placeholder="76.123.456-7" /></div>
                        <div><label className="text-xs text-slate-500">Contacto</label><input value={contact} onChange={(e) => setContact(e.target.value)} className={input} /></div>
                        <div className="md:col-span-2"><label className="text-xs text-slate-500">Correo</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></div>
                    </section>

                    <section className="space-y-2">
                        <button type="button" onClick={() => setShowCalendar(!showCalendar)} className="text-sm text-emerald-600 hover:underline">
                            {showCalendar ? "Ocultar calendario general" : "Usar un calendario general (opcional)"}
                        </button>
                        {showCalendar && (
                            <div className="flex flex-col md:flex-row gap-5">
                                <DateRangeField mode="rango" start={start} end={end} onChange={onGeneralRange} />
                                <div className="text-sm text-slate-600 space-y-1">
                                    <div>Entrada: <strong>{start ? formatDateDMY(start) : "—"}</strong></div>
                                    <div>Salida: <strong>{end ? formatDateDMY(end) : "— (elige la fecha de salida)"}</strong></div>
                                    <p className="text-xs text-slate-400 max-w-56">Rellena las líneas que aún no tienen fechas y las líneas nuevas. Cada línea se puede cambiar por separado.</p>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700">Habitaciones</h3>
                            <button type="button" onClick={() => setLines([...lines, blankLine(start && end ? start : "", start && end ? end : "")])} className="text-sm text-emerald-600 hover:underline">+ Agregar línea</button>
                        </div>
                        {lines.map((l, i) => {
                            const r = calc.lines[i];
                            const tooMany = l.dates.length > MAX_NIGHTS_PER_LINE;
                            return (
                                <div key={i} className="border border-slate-200 rounded-md p-3 space-y-3">
                                    <div className="grid grid-cols-12 gap-2 items-end">
                                        <div className="col-span-4"><label className="text-xs text-slate-500">Ocupación</label>
                                            <select value={l.occupancy} onChange={(e) => setLine(i, { occupancy: e.target.value as Occupancy, rate: "" })} className={input}>
                                                {OCCUPANCIES.map((o) => <option key={o} value={o}>{OCCUPANCY_LABELS[o]}</option>)}
                                            </select></div>
                                        <div className="col-span-3"><label className="text-xs text-slate-500">Habitaciones</label><input type="number" min={1} value={l.rooms} onChange={(e) => setLine(i, { rooms: e.target.value })} className={input} /></div>
                                        <div className="col-span-3"><label className="text-xs text-slate-500">Tarifa / noche
                                                <select value={l.rateMode} onChange={(e) => setLine(i, { rateMode: e.target.value as "neto" | "con_iva" })} className="ml-1 text-xs border border-slate-300 rounded px-1">
                                                    <option value="neto">neto</option><option value="con_iva">con IVA</option>
                                                </select></label>
                                            <input type="number" min={0} value={l.rate === "" ? (l.rateMode === "con_iva" ? ivaRateFromNet(rates[l.occupancy]) : rates[l.occupancy]) || "" : l.rate} placeholder="0"
                                                onChange={(e) => setLine(i, { rate: e.target.value })} className={input} /></div>
                                        <button type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, k) => k !== i))} className="col-span-2 pb-2 text-slate-400 hover:text-red-500 disabled:opacity-30 justify-self-end" title="Quitar línea"><Trash2 size={16} /></button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-slate-500">Fechas:</span>
                                            {(["rango", "recurrente"] as const).map((m) => (
                                                <label key={m} className="flex items-center gap-1 text-sm">
                                                    <input type="radio" name={`mode-${i}`} checked={l.mode === m} onChange={() => setLineMode(i, m)} /> {m === "rango" ? "Rango" : "Recurrente"}
                                                </label>
                                            ))}
                                        </div>
                                        {l.mode === "rango" ? (
                                            <div>
                                                <label className="text-xs text-slate-500">Entrada → Salida</label>
                                                <div><DateRangeField mode="rango" start={l.rStart} end={l.rEnd} onChange={(s, e) => setRange(i, s, e)} /></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex gap-1" role="group" aria-label="Días de la semana">
                                                    {WEEKDAY_BUTTONS.map((w) => (
                                                        <button key={w.n} type="button" title={w.title} aria-pressed={l.weekdays.includes(w.n)} onClick={() => toggleWeekday(i, w.n)}
                                                            className={`w-9 h-9 rounded-md text-sm font-medium border ${l.weekdays.includes(w.n) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}>{w.label}</button>
                                                    ))}
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500">Desde → Hasta</label>
                                                    <div><DateRangeField mode="recurrente" start={l.from} end={l.to} onChange={(s, e) => setRecurring(i, { from: s, to: e })} /></div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="text-sm text-slate-700">
                                            {l.dates.length > 0 ? <strong>{describeDates(l.dates)}</strong> : <span className="text-slate-400">0 noches</span>}
                                            <span className="float-right text-slate-800 font-medium">{money(r?.subtotal ?? 0)}</span>
                                        </div>
                                        {l.dates.length > 0 && (
                                            <details className="text-xs text-slate-500">
                                                <summary className="cursor-pointer">Ver las {l.dates.length} fechas</summary>
                                                <div className="mt-1 max-h-24 overflow-y-auto">{[...l.dates].sort().map(formatDateDMY).join(", ")}</div>
                                            </details>
                                        )}
                                        {(tooMany || (lineErrors[i] && l.dates.length > 0)) && <div className="text-xs text-red-600">{lineErrors[i]}</div>}
                                        {l.dates.length === 0 && <div className="text-xs text-amber-600">Elige las fechas de esta línea.</div>}
                                        {(() => {
                                            const list = normalizePassengers(l.passengers.split("\n"));
                                            const perr = passengersError(list);
                                            return (
                                                <div>
                                                    <div className="flex justify-between items-baseline">
                                                        <label className="text-xs text-slate-500">Pasajeros (opcional)</label>
                                                        <span className="text-xs text-slate-500">{list.length} {list.length === 1 ? "pasajero" : "pasajeros"}</span>
                                                    </div>
                                                    <textarea rows={3} value={l.passengers} onChange={(e) => setLine(i, { passengers: e.target.value })} className={input} placeholder={"Maximiliano Rojas / Cristian Jara\nJuan Pérez"} />
                                                    <div className="text-xs text-slate-400">Una habitación por línea. Si comparten habitación, sepáralos con /</div>
                                                    {perr && <div className="text-xs text-red-600">{perr}</div>}
                                                    {!perr && list.length > (Number(l.rooms) || 0) && <div className="text-xs text-amber-600">Hay más entradas ({list.length}) que habitaciones ({Number(l.rooms) || 0}) en esta línea.</div>}
                                                </div>
                                            );
                                        })()}
                                        {r?.rate_missing && <div className="text-xs text-amber-600 inline-flex items-center gap-1"><AlertTriangle size={13} /> tarifa sin cargar — escríbela a mano</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    <section className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-3">
                            <fieldset className="border border-slate-200 rounded-md p-3 space-y-2">
                                <legend className="px-1 text-xs font-semibold text-slate-600">Descuento</legend>
                                <label className="flex items-center gap-2 text-sm"><input type="radio" name="disc" checked={effMode === "ninguno"} onChange={() => setDiscMode("ninguno")} /> Sin descuento</label>
                                {companyHasDiscount && (
                                    <label className="flex items-center gap-2 text-sm"><input type="radio" name="disc" checked={effMode === "empresa"} onChange={() => setDiscMode("empresa")} />
                                        De la empresa <span className="text-emerald-700">({discountLabel(company!.discount_type, company!.discount_value, COMPANY_DISCOUNT_LABEL)})</span></label>
                                )}
                                <label className="flex items-center gap-2 text-sm"><input type="radio" name="disc" checked={effMode === "manual"} onChange={() => setDiscMode("manual")} /> Manual</label>
                                {effMode === "manual" && (
                                    <div className="grid grid-cols-3 gap-2 pl-6">
                                        <div><label className="text-xs text-slate-500">Tipo</label>
                                            <select value={manType} onChange={(e) => setManType(e.target.value as any)} className={input}>
                                                <option value="porcentaje">Porcentaje (%)</option><option value="monto_fijo">Monto fijo ($)</option>
                                            </select></div>
                                        <div><label className="text-xs text-slate-500">Valor</label>
                                            <input type="number" min={0} value={manValue} onChange={(e) => setManValue(e.target.value)} className={input} /></div>
                                        <div><label className="text-xs text-slate-500">Motivo (opcional)</label>
                                            <input value={manReason} onChange={(e) => setManReason(e.target.value)} placeholder="Descuento comercial" className={input} /></div>
                                        {discountError && <div className="col-span-3 text-xs text-red-600">{discountError}</div>}
                                    </div>
                                )}
                            </fieldset>
                            <div>
                                <label className="text-xs text-slate-500">Vigencia (días) {settings.validity_provisional && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">provisional</span>}</label>
                                <input type="number" min={1} value={validity} onChange={(e) => setValidity(e.target.value)} className={input + " w-28"} />
                            </div>
                            <div><label className="text-xs text-slate-500">Condiciones (una por línea)</label>
                                <textarea rows={4} value={conditions} onChange={(e) => setConditions(e.target.value)} className={input} /></div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1 h-fit">
                            {calc.discount > 0 && (<>
                                <div className="flex justify-between"><span>Subtotal</span><span>{money(calc.gross)}</span></div>
                                <div className="flex justify-between text-emerald-700"><span>{discountLabel(eff.type, eff.value, eff.label)}</span><span>-{money(calc.discount)}</span></div>
                            </>)}
                            <div className="flex justify-between"><span>Neto</span><span>{money(calc.net)}</span></div>
                            <div className="flex justify-between"><span>IVA (19%)</span><span>{money(calc.iva)}</span></div>
                            <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2"><span>Total</span><span>{money(calc.total)}</span></div>
                        </div>
                    </section>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
                    <button disabled={saving} onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800">Cancelar</button>
                    <button disabled={saving} onClick={() => submit(false)} className="px-4 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        {mode === "edit" ? "Guardar cambios" : "Guardar borrador"}
                    </button>
                    <button disabled={saving} onClick={() => submit(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium disabled:opacity-50">
                        {saving ? "Procesando..." : "Guardar y Enviar Cotización"}
                    </button>
                </div>
            </div>
        </div>
    );
}
