"use client";

import { Fragment, useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Send, Pencil, Copy, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { STATUS_STYLE } from "@/components/quotes/statusStyle";
import {
    OCCUPANCY_LABELS, calculateQuote, describeLine, discountLabel, emptyRates, formatQuoteCode, normalizeDiscountType, passengersText, stayText, type RateTable,
} from "@/lib/quotes/calc";
import type { QuoteRow } from "@/lib/quotes/service";

const money = (n: number) => "$" + n.toLocaleString("es-CL");
const fmtDate = (d?: string | null) => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" }) : "—");

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="flex gap-3 py-1"><dt className="w-40 shrink-0 text-slate-500">{label}</dt><dd className="text-slate-800">{children}</dd></div>;
}

export default function CotizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [quote, setQuote] = useState<QuoteRow | null>(null);
    const [rates, setRates] = useState<RateTable>(emptyRates());
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState<"" | "send" | "delete">("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [q, ctx] = await Promise.all([fetch(`/api/quotes/${id}`), fetch("/api/quotes/context")]);
            const [qj, xj] = await Promise.all([q.json(), ctx.json()]);
            if (!qj.ok) throw new Error(qj.error);
            setQuote(qj.data);
            setEmail(qj.data.contact_email ?? "");
            if (xj.ok) setRates(xj.data.rates);
        } catch (e: any) {
            toast.error(e.message || "No se pudo cargar la cotización");
        } finally {
            setLoading(false);
        }
    }, [id]);
    useEffect(() => { load(); }, [load]);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
    if (!quote) return (
        <div className="p-6 max-w-3xl mx-auto space-y-3">
            <p className="text-slate-600">No se encontró la cotización.</p>
            <Link href="/panel/cotizaciones" className="inline-block px-3 py-2 border border-slate-300 rounded-md text-sm">Volver a cotizaciones</Link>
        </div>
    );

    const calc = calculateQuote({ lines: quote.lines, rates, discount_type: quote.discount_type, discount_value: quote.discount_value });
    const nights = calc.lines[0]?.nights ?? 0;
    const { shared, text: stay } = stayText(quote.lines, quote.check_in, quote.check_out);
    const isDraft = quote.status === "borrador";
    const code = formatQuoteCode(quote.number);
    const hasDiscount = normalizeDiscountType(quote.discount_type) !== "ninguno" && quote.discount > 0;

    const send = async () => {
        if (!email.trim()) return toast.error("Ingresa un correo de destino.");
        if (!window.confirm(`¿${isDraft ? "Enviar" : "Reenviar"} la cotización ${code} a ${email.trim()}?`)) return;
        setBusy("send");
        try {
            const r = await (await fetch(`/api/quotes/${quote.id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) })).json();
            if (!r.ok) throw new Error(r.error);
            if (r.simulated) toast.warning("EL CORREO NO SALIÓ: el sistema está en modo simulado. La cotización quedó como borrador.", { duration: 15000 });
            else toast.success("Cotización enviada.");
            await load();
        } catch (e: any) {
            toast.error(e.message || "No se pudo enviar");
        } finally {
            setBusy("");
        }
    };

    const remove = async () => {
        if (!window.confirm(`¿Eliminar el borrador ${code}? Esta acción no se puede deshacer.`)) return;
        setBusy("delete");
        try {
            const r = await (await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" })).json();
            if (!r.ok) throw new Error(r.error);
            toast.success("Borrador eliminado.");
            router.replace("/panel/cotizaciones");
        } catch (e: any) {
            toast.error(e.message || "No se pudo eliminar");
            setBusy("");
        }
    };

    const btn = "px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 border";

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <Link href="/panel/cotizaciones" className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}><ArrowLeft size={16} /> Volver a cotizaciones</Link>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-800">{code}</h1>
                    <span className={`text-xs rounded-full px-2.5 py-1 ${STATUS_STYLE[quote.status]}`}>{quote.status}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <a href={`/api/quotes/${quote.id}/pdf`} className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}><Download size={16} /> Descargar PDF</a>
                    {isDraft ? (
                        <Link href={`/panel/cotizaciones?editar=${quote.id}`} className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}><Pencil size={16} /> Editar</Link>
                    ) : (
                        <Link href={`/panel/cotizaciones?duplicar=${quote.id}`} className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}><Copy size={16} /> Duplicar como nueva</Link>
                    )}
                    {isDraft && <Link href={`/panel/cotizaciones?duplicar=${quote.id}`} className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}><Copy size={16} /> Duplicar</Link>}
                    {isDraft && <button disabled={busy !== ""} onClick={remove} className={`${btn} border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50`}><Trash2 size={16} /> Eliminar</button>}
                </div>
            </div>

            <section className="bg-white rounded-lg border border-slate-200 p-5 grid md:grid-cols-2 gap-x-8 text-sm">
                <dl>
                    <Row label="Empresa">{quote.company_name}</Row>
                    <Row label="RUT">{quote.company_rut || "—"}</Row>
                    <Row label="Contacto">{quote.contact_name || "—"}</Row>
                    <Row label="Correo">{quote.contact_email || "—"}</Row>
                </dl>
                <dl>
                    {shared ? (<>
                    <Row label="Entrada">{fmtDate(quote.check_in)}</Row>
                    <Row label="Salida">{fmtDate(quote.check_out)}</Row>
                    <Row label="Noches">{nights}</Row>
                    </>) : <Row label="Estadía">{stay}</Row>}
                    <Row label="Vigencia">{quote.validity_days} días{quote.valid_until ? ` (hasta el ${fmtDate(quote.valid_until)})` : ""}</Row>
                    <Row label="Fecha de envío">{quote.sent_at ? fmtDate(quote.sent_at) : (quote.status === "enviada" || quote.status === "aceptada") ? "Sin envío registrado por el sistema" : "Sin enviar"}</Row>
                </dl>
            </section>

            <section className="bg-white rounded-lg border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-700 mb-3">Habitaciones</h2>
                <table className="w-full text-sm">
                    <thead className="text-slate-500 text-left"><tr><th className="py-1">Ocupación</th><th>Hab.</th><th>Noches</th><th className="text-right">Neto/noche</th><th className="text-right">Subtotal neto</th></tr></thead>
                    <tbody>
                        {calc.lines.map((l, i) => (
                            <Fragment key={i}><tr className="border-t border-slate-100"><td className="py-1.5">{OCCUPANCY_LABELS[l.occupancy]}</td><td>{l.rooms}</td><td>{l.nights}</td><td className="text-right">{money(l.rate)}</td><td className="text-right">{money(l.subtotal)}</td></tr><tr><td colSpan={5} className="pb-1.5 text-xs text-slate-500">{describeLine(quote.lines[i] ?? {}, quote.check_in, quote.check_out)}{passengersText(quote.lines[i]?.passengers) && <div className="mt-0.5 text-slate-600 break-words">Pasajeros: {passengersText(quote.lines[i]?.passengers)}</div>}</td></tr></Fragment>
                        ))}
                    </tbody>
                </table>
                <div className="mt-4 ml-auto w-full max-w-xs text-sm space-y-1">
                    {hasDiscount && (<>
                        <div className="flex justify-between"><span>Subtotal</span><span>{money(quote.gross)}</span></div>
                        <div className="flex justify-between text-emerald-700"><span>{discountLabel(quote.discount_type, quote.discount_value, quote.discount_label)}</span><span>-{money(quote.discount)}</span></div>
                    </>)}
                    <div className="flex justify-between"><span>Neto</span><span>{money(quote.net)}</span></div>
                    <div className="flex justify-between"><span>IVA (19%)</span><span>{money(quote.iva)}</span></div>
                    <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2"><span>Total</span><span>{money(quote.total)}</span></div>
                </div>
            </section>

            <section className="bg-white rounded-lg border border-slate-200 p-5 text-sm">
                <h2 className="font-semibold text-slate-700 mb-2">Condiciones</h2>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    {(quote.conditions || "").split("\n").map((c) => c.trim()).filter(Boolean).map((c, i) => <li key={i}>{c}</li>)}
                </ul>
            </section>

            {quote.notes?.trim() && (
                <section className="bg-white rounded-lg border border-slate-200 p-5 text-sm">
                    <h2 className="font-semibold text-slate-700 mb-2">Observaciones</h2>
                    <p className="text-slate-700 whitespace-pre-line">{quote.notes}</p>
                </section>
            )}

            <section className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
                <h2 className="font-semibold text-slate-700">{isDraft ? "Enviar por correo" : "Reenviar por correo"}</h2>
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-64">
                        <label className="text-xs text-slate-500">Correo destino (puedes cambiarlo antes de enviar)</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="px-2 py-2 border border-slate-300 rounded-md text-sm w-full" />
                    </div>
                    <button disabled={busy !== ""} onClick={send} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
                        {busy === "send" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {isDraft ? "Enviar por correo" : "Reenviar por correo"}
                    </button>
                </div>
                {isDraft && <p className="text-xs text-slate-400">Si el sistema está en modo simulado, el correo no sale y la cotización sigue en borrador.</p>}
            </section>
        </div>
    );
}
