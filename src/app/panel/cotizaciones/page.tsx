"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import QuoteForm, { type FormCompany, type FormSettings } from "@/components/quotes/QuoteForm";
import { DEFAULT_CONDITIONS, DEFAULT_VALIDITY_DAYS, QUOTE_STATUSES, emptyRates, formatQuoteCode, formatListDate, formatDateDMY, type RateTable } from "@/lib/quotes/calc";
import type { QuoteRow } from "@/lib/quotes/service";
import { STATUS_STYLE } from "@/components/quotes/statusStyle";

const money = (n: number) => "$" + n.toLocaleString("es-CL");

type FormState = { mode: "create" | "edit"; quote: QuoteRow | null } | null;

function CotizacionesInner() {
    const { role } = useAuth();
    const router = useRouter();
    const params = useSearchParams();
    const [quotes, setQuotes] = useState<QuoteRow[]>([]);
    const [companies, setCompanies] = useState<FormCompany[]>([]);
    const [rates, setRates] = useState<RateTable>(emptyRates());
    const [settings, setSettings] = useState<FormSettings>({ validity_days: DEFAULT_VALIDITY_DAYS, validity_provisional: true, default_conditions: DEFAULT_CONDITIONS });
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    const [form, setForm] = useState<FormState>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [q, c, ctx] = await Promise.all([fetch("/api/quotes"), fetch("/api/companies"), fetch("/api/quotes/context")]);
            const [qj, cj, xj] = await Promise.all([q.json(), c.json(), ctx.json()]);
            if (qj.ok) setQuotes(qj.data);
            if (Array.isArray(cj)) setCompanies(cj);
            if (xj.ok) { setRates(xj.data.rates); setSettings(xj.data.settings); }
        } catch {
            toast.error("Error al cargar cotizaciones");
        } finally {
            setLoading(false);
            setReady(true);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    // ?editar=ID  /  ?duplicar=ID  (vienen desde la vista de detalle)
    const editarId = params.get("editar");
    const duplicarId = params.get("duplicar");
    useEffect(() => {
        if (!ready || (!editarId && !duplicarId)) return;
        const id = Number(editarId ?? duplicarId);
        (async () => {
            const r = await (await fetch(`/api/quotes/${id}`)).json();
            if (!r.ok) { toast.error(r.error || "No se pudo abrir la cotización"); router.replace("/panel/cotizaciones"); return; }
            if (editarId && r.data.status !== "borrador") {
                toast.error("Solo se pueden editar cotizaciones en borrador."); router.replace("/panel/cotizaciones"); return;
            }
            setForm({ mode: editarId ? "edit" : "create", quote: r.data });
        })();
    }, [ready, editarId, duplicarId, router]);

    const closeForm = () => { setForm(null); if (editarId || duplicarId) router.replace("/panel/cotizaciones"); };

    const changeStatus = async (id: number, status: string) => {
        const res = await (await fetch(`/api/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })).json();
        if (!res.ok) return toast.error(res.error);
        setQuotes((p) => p.map((q) => (q.id === id ? { ...q, status: status as QuoteRow["status"] } : q)));
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Cotizaciones</h1>
                <div className="flex gap-2">
                    {role === "superadmin" && (
                        <Link href="/panel/cotizaciones/tarifas" className="px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-600 hover:bg-slate-50 inline-flex items-center gap-2"><Settings size={16} /> Tarifas</Link>
                    )}
                    <button onClick={() => setForm({ mode: "create", quote: null })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium inline-flex items-center gap-2"><Plus size={16} /> Nueva cotización</button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div> : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-left">
                            <tr><th className="p-3">N°</th><th className="p-3">Empresa</th><th className="p-3">Fechas</th><th className="p-3 text-right">Total c/ IVA</th><th className="p-3">Vigente hasta</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
                        </thead>
                        <tbody>
                            {quotes.map((q) => (
                                <tr key={q.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/panel/cotizaciones/${q.id}`)}>
                                    <td className="p-3 font-medium">{formatQuoteCode(q.number)}</td>
                                    <td className="p-3">{q.company_name}<div className="text-xs text-slate-400">{q.contact_email}</div></td>
                                    <td className="p-3">{formatListDate(q.check_in)} → {formatListDate(q.check_out)}</td>
                                    <td className="p-3 text-right">{money(q.total)}</td>
                                    <td className="p-3">{q.valid_until ? formatDateDMY(q.valid_until) : "-"}</td>
                                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                        <select value={q.status} onChange={(e) => changeStatus(q.id, e.target.value)} className={`text-xs rounded-full px-2 py-1 border-0 ${STATUS_STYLE[q.status]}`}>
                                            {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                        <Link href={`/panel/cotizaciones/${q.id}`} className="px-3 py-1.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-md text-sm font-medium">Ver</Link>
                                    </td>
                                </tr>
                            ))}
                            {quotes.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Aún no hay cotizaciones.</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>

            {form && (
                <QuoteForm
                    mode={form.mode} quote={form.quote} companies={companies} rates={rates} settings={settings}
                    onClose={closeForm}
                    onSaved={() => { const detailId = form.mode === "edit" ? form.quote?.id : null; setForm(null); if (detailId) router.replace(`/panel/cotizaciones/${detailId}`); else { if (editarId || duplicarId) router.replace("/panel/cotizaciones"); load(); } }}
                />
            )}
        </div>
    );
}

export default function CotizacionesPage() {
    return <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>}><CotizacionesInner /></Suspense>;
}
