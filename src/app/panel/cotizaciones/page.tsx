"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Loader2, AlertTriangle, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import RangeCalendar from "@/components/quotes/RangeCalendar";
import {
    OCCUPANCIES, OCCUPANCY_LABELS, DEFAULT_CONDITIONS, DEFAULT_VALIDITY_DAYS, QUOTE_STATUSES,
    calculateQuote, emptyRates, formatQuoteCode, nightsBetween,
    type DiscountType, type Occupancy, type RateTable,
} from "@/lib/quotes/calc";

type Company = {
    id: number; name: string; rut: string | null; contact_name: string | null; contact_email: string | null;
    discount_type: DiscountType; discount_value: number; is_active: boolean;
};
type QuoteListRow = {
    id: number; number: number; company_name: string; contact_email: string | null; check_in: string; check_out: string;
    total: number; status: string; valid_until: string | null;
};
type FormLine = { occupancy: Occupancy; rooms: string; rate: string }; // rate = "" -> usa la tabla

const money = (n: number) => "$" + n.toLocaleString("es-CL");
const STATUS_STYLE: Record<string, string> = {
    borrador: "bg-slate-100 text-slate-600", enviada: "bg-blue-100 text-blue-700", aceptada: "bg-emerald-100 text-emerald-700",
    rechazada: "bg-red-100 text-red-700", vencida: "bg-amber-100 text-amber-700",
};

export default function CotizacionesPage() {
    const { role } = useAuth();
    const [quotes, setQuotes] = useState<QuoteListRow[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [rates, setRates] = useState<RateTable>(emptyRates());
    const [validityDefault, setValidityDefault] = useState(DEFAULT_VALIDITY_DAYS);
    const [provisional, setProvisional] = useState(true);
    const [defaultConditions, setDefaultConditions] = useState(DEFAULT_CONDITIONS);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // formulario
    const [companyId, setCompanyId] = useState<string>(""); // "" = escrita a mano
    const [companyName, setCompanyName] = useState("");
    const [rut, setRut] = useState("");
    const [contact, setContact] = useState("");
    const [email, setEmail] = useState("");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [lines, setLines] = useState<FormLine[]>([{ occupancy: "doble", rooms: "1", rate: "" }]);
    const [validity, setValidity] = useState("7");
    const [conditions, setConditions] = useState(DEFAULT_CONDITIONS);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [q, c, ctx] = await Promise.all([
                fetch("/api/quotes"), fetch("/api/companies"), fetch("/api/quotes/context"),
            ]);
            const [qj, cj, xj] = await Promise.all([q.json(), c.json(), ctx.json()]);
            if (qj.ok) setQuotes(qj.data);
            if (Array.isArray(cj)) setCompanies(cj.filter((x: Company) => x.is_active));
            if (xj.ok) {
                setRates(xj.data.rates);
                setValidityDefault(xj.data.settings.validity_days);
                setProvisional(xj.data.settings.validity_provisional);
                setDefaultConditions(xj.data.settings.default_conditions);
            }
        } catch {
            toast.error("Error al cargar cotizaciones");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const company = companies.find((c) => String(c.id) === companyId);
    const nights = nightsBetween(start, end);

    const calc = useMemo(() => calculateQuote({
        lines: lines.map((l) => ({ occupancy: l.occupancy, rooms: Number(l.rooms), nights, rate_override: l.rate === "" ? null : Number(l.rate) })),
        rates,
        discount_type: company?.discount_type ?? "ninguno",
        discount_value: company?.discount_value ?? 0,
    }), [lines, rates, nights, company]);

    const openNew = () => {
        setCompanyId(""); setCompanyName(""); setRut(""); setContact(""); setEmail(""); setStart(""); setEnd("");
        setLines([{ occupancy: "doble", rooms: "1", rate: "" }]);
        setValidity(String(validityDefault)); setConditions(defaultConditions);
        setOpen(true);
    };

    const onCompany = (id: string) => {
        setCompanyId(id);
        const c = companies.find((x) => String(x.id) === id);
        if (c) { setCompanyName(c.name); setRut(c.rut ?? ""); setContact(c.contact_name ?? ""); setEmail(c.contact_email ?? ""); }
    };

    const setLine = (i: number, patch: Partial<FormLine>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));

    const submit = async (andSend: boolean) => {
        if (andSend && !email.trim()) return toast.error("Ingresa el correo del contacto para enviar.");
        if (calc.has_missing_rates) return toast.error("Hay líneas con «tarifa sin cargar»: escribe la tarifa a mano.");
        setSaving(true);
        try {
            const res = await fetch("/api/quotes", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_id: company?.id ?? null, company_name: companyName, company_rut: rut, contact_name: contact, contact_email: email,
                    check_in: start, check_out: end, validity_days: Number(validity), conditions,
                    lines: lines.map((l) => ({ occupancy: l.occupancy, rooms: Number(l.rooms), rate_override: l.rate === "" ? null : Number(l.rate) })),
                }),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error);
            if (andSend) {
                const s = await (await fetch(`/api/quotes/${json.data.id}/send`, { method: "POST" })).json();
                if (!s.ok) throw new Error(`Cotización guardada como borrador, pero el envío falló: ${s.error}`);
                if (s.simulated) {
                    toast.warning("EL CORREO NO SALIÓ: el sistema está en modo simulado. La cotización quedó como borrador.", { duration: 15000 });
                } else {
                    toast.success("Cotización enviada.");
                }
            } else {
                toast.success("Borrador guardado.");
            }
            setOpen(false);
            load();
        } catch (e: any) {
            toast.error(e.message || "Error al guardar");
            load();
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async (id: number, status: string) => {
        const res = await (await fetch(`/api/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })).json();
        if (!res.ok) return toast.error(res.error);
        setQuotes((p) => p.map((q) => (q.id === id ? { ...q, status } : q)));
    };

    const input = "px-2 py-2 border border-slate-300 rounded-md text-sm w-full";

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Cotizaciones</h1>
                <div className="flex gap-2">
                    {role === "superadmin" && (
                        <Link href="/panel/cotizaciones/tarifas" className="px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-600 hover:bg-slate-50 inline-flex items-center gap-2"><Settings size={16} /> Tarifas</Link>
                    )}
                    <button onClick={openNew} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium inline-flex items-center gap-2"><Plus size={16} /> Nueva cotización</button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div> : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-left">
                            <tr><th className="p-3">N°</th><th className="p-3">Empresa</th><th className="p-3">Fechas</th><th className="p-3 text-right">Total c/ IVA</th><th className="p-3">Vigente hasta</th><th className="p-3">Estado</th></tr>
                        </thead>
                        <tbody>
                            {quotes.map((q) => (
                                <tr key={q.id} className="border-t border-slate-100">
                                    <td className="p-3 font-medium">{formatQuoteCode(q.number)}</td>
                                    <td className="p-3">{q.company_name}<div className="text-xs text-slate-400">{q.contact_email}</div></td>
                                    <td className="p-3">{q.check_in} → {q.check_out}</td>
                                    <td className="p-3 text-right">{money(q.total)}</td>
                                    <td className="p-3">{q.valid_until ?? "-"}</td>
                                    <td className="p-3">
                                        <select value={q.status} onChange={(e) => changeStatus(q.id, e.target.value)} className={`text-xs rounded-full px-2 py-1 border-0 ${STATUS_STYLE[q.status]}`}>
                                            {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {quotes.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Aún no hay cotizaciones.</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>

            {open && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-6">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-800">Nueva cotización</h2>
                            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
                        </div>

                        <div className="p-5 space-y-5">
                            <section className="grid md:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500">Empresa registrada (opcional)</label>
                                    <select value={companyId} onChange={(e) => onCompany(e.target.value)} className={input}>
                                        <option value="">— Escribir a mano —</option>
                                        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-xs text-slate-500">Nombre empresa *</label><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={input} /></div>
                                <div><label className="text-xs text-slate-500">RUT</label><input value={rut} onChange={(e) => setRut(e.target.value)} className={input} placeholder="76.123.456-7" /></div>
                                <div><label className="text-xs text-slate-500">Contacto</label><input value={contact} onChange={(e) => setContact(e.target.value)} className={input} /></div>
                                <div className="md:col-span-2"><label className="text-xs text-slate-500">Correo</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></div>
                            </section>

                            <section className="flex flex-col md:flex-row gap-5">
                                <RangeCalendar start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
                                <div className="text-sm text-slate-600 space-y-1">
                                    <div>Entrada: <strong>{start || "—"}</strong></div>
                                    <div>Salida: <strong>{end || "— (elige la fecha de salida)"}</strong></div>
                                    <div>Noches: <strong>{nights}</strong></div>
                                </div>
                            </section>

                            <section className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-700">Habitaciones</h3>
                                    <button type="button" onClick={() => setLines([...lines, { occupancy: "doble", rooms: "1", rate: "" }])} className="text-sm text-emerald-600 hover:underline">+ Agregar línea</button>
                                </div>
                                {lines.map((l, i) => {
                                    const r = calc.lines[i];
                                    return (
                                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                                            <div className="col-span-3"><label className="text-xs text-slate-500">Ocupación</label>
                                                <select value={l.occupancy} onChange={(e) => setLine(i, { occupancy: e.target.value as Occupancy, rate: "" })} className={input}>
                                                    {OCCUPANCIES.map((o) => <option key={o} value={o}>{OCCUPANCY_LABELS[o]}</option>)}
                                                </select></div>
                                            <div className="col-span-2"><label className="text-xs text-slate-500">Habitaciones</label><input type="number" min={1} value={l.rooms} onChange={(e) => setLine(i, { rooms: e.target.value })} className={input} /></div>
                                            <div className="col-span-2"><label className="text-xs text-slate-500">Noches</label><input readOnly value={nights} className={input + " bg-slate-50"} /></div>
                                            <div className="col-span-3"><label className="text-xs text-slate-500">Neto / noche</label>
                                                <input type="number" min={0} value={l.rate === "" ? (rates[l.occupancy] || "") : l.rate} placeholder="0"
                                                    onChange={(e) => setLine(i, { rate: e.target.value })} className={input} /></div>
                                            <div className="col-span-1 text-right text-sm text-slate-600 pb-2">{money(r?.subtotal ?? 0)}</div>
                                            <button type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, k) => k !== i))} className="col-span-1 pb-2 text-slate-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={16} /></button>
                                            {r?.rate_missing && <div className="col-span-12 text-xs text-amber-600 inline-flex items-center gap-1"><AlertTriangle size={13} /> tarifa sin cargar — escríbela a mano</div>}
                                        </div>
                                    );
                                })}
                            </section>

                            <section className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-slate-500">Vigencia (días) {provisional && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">provisional</span>}</label>
                                        <input type="number" min={1} value={validity} onChange={(e) => setValidity(e.target.value)} className={input + " w-28"} />
                                    </div>
                                    <div><label className="text-xs text-slate-500">Condiciones (una por línea)</label>
                                        <textarea rows={4} value={conditions} onChange={(e) => setConditions(e.target.value)} className={input} /></div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1 h-fit">
                                    {calc.discount > 0 && (<>
                                        <div className="flex justify-between"><span>Subtotal</span><span>{money(calc.gross)}</span></div>
                                        <div className="flex justify-between text-emerald-700"><span>Descuento empresa</span><span>-{money(calc.discount)}</span></div>
                                    </>)}
                                    <div className="flex justify-between"><span>Neto</span><span>{money(calc.net)}</span></div>
                                    <div className="flex justify-between"><span>IVA (19%)</span><span>{money(calc.iva)}</span></div>
                                    <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2"><span>Total</span><span>{money(calc.total)}</span></div>
                                </div>
                            </section>
                        </div>

                        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
                            <button disabled={saving} onClick={() => submit(false)} className="px-4 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">Guardar borrador</button>
                            <button disabled={saving} onClick={() => submit(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium disabled:opacity-50">
                                {saving ? "Procesando..." : "Guardar y Enviar Cotización"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
