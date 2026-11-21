"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
    OCCUPANCIES, OCCUPANCY_LABELS, DEFAULT_CONDITIONS, emptyRates, toNetRate, withIva,
    type Occupancy, type RateInputMode, type RateTable,
} from "@/lib/quotes/calc";

const fmt = (n: number) => n.toLocaleString("es-CL");
const money = (n: number) => "$" + fmt(n);
const digits = (s: string) => Number(s.replace(/\D/g, "")) || 0;

export default function TarifasPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [mode, setMode] = useState<RateInputMode>("con_iva"); // por defecto: los valores incluyen IVA
    const [saved, setSaved] = useState<RateTable>(emptyRates()); // neto guardado en BD
    const [vals, setVals] = useState<Record<Occupancy, number>>({ single: 0, doble: 0, triple: 0, cuadruple: 0 }); // lo que se ve en los campos
    const [validity, setValidity] = useState("7");
    const [provisional, setProvisional] = useState(true);
    const [qMode, setQMode] = useState<"automatico" | "revision">("revision");
    const [conditions, setConditions] = useState(DEFAULT_CONDITIONS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const toDisplay = (net: RateTable, m: RateInputMode) =>
        Object.fromEntries(OCCUPANCIES.map((o) => [o, m === "con_iva" ? withIva(net[o]) : net[o]])) as Record<Occupancy, number>;
    const netOf = (v: number) => toNetRate(v, mode);

    useEffect(() => {
        if (authLoading) return;
        if (!user || role !== "superadmin") {
            toast.error("Solo administradores pueden ver las tarifas.");
            router.replace("/panel/cotizaciones");
            return;
        }
        (async () => {
            try {
                const [r, s] = await Promise.all([fetch("/api/quote-rates"), fetch("/api/quote-settings")]);
                const rj = await r.json(), sj = await s.json();
                if (rj.ok) { setSaved(rj.data); setVals(toDisplay(rj.data, "con_iva")); }
                if (sj.ok) {
                    setValidity(String(sj.data.validity_days));
                    setProvisional(sj.data.validity_provisional);
                    setQMode(sj.data.mode);
                    setConditions(sj.data.default_conditions);
                }
            } catch {
                toast.error("Error al cargar tarifas");
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user, role, router]);

    // Cambiar el selector conserva el mismo valor neto y lo muestra en la nueva modalidad.
    const changeMode = (m: RateInputMode) => {
        const net = Object.fromEntries(OCCUPANCIES.map((o) => [o, netOf(vals[o])])) as RateTable;
        setMode(m);
        setVals(toDisplay(net, m));
    };

    const save = async () => {
        setSaving(true);
        try {
            const net = Object.fromEntries(OCCUPANCIES.map((o) => [o, netOf(vals[o])])) as RateTable;
            const [a, b] = await Promise.all([
                fetch("/api/quote-rates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(net) }),
                fetch("/api/quote-settings", {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ validity_days: Number(validity), mode: qMode, default_conditions: conditions }),
                }),
            ]);
            const aj = await a.json(), bj = await b.json();
            if (!aj.ok || !bj.ok) throw new Error(aj.error || bj.error);
            setSaved(aj.data);
            setProvisional(bj.data.validity_provisional);
            toast.success("Tarifas guardadas");
        } catch (err: any) {
            toast.error(err.message || "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || authLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

    const backBtn = "px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2";

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6 pb-28">
            <div className="space-y-3">
                <Link href="/panel/cotizaciones" className={backBtn}><ArrowLeft size={16} /> Volver a cotizaciones</Link>
                <h1 className="text-2xl font-bold text-slate-800">Tarifas de cotización</h1>
                <p className="text-sm text-slate-500">Internamente se guarda siempre la tarifa <strong>neta</strong> por noche. El descuento por empresa se configura en Empresas.</p>
            </div>

            <section className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm text-slate-700 font-medium">Los valores que ingreso:</label>
                    <select value={mode} onChange={(e) => changeMode(e.target.value as RateInputMode)} className="px-2 py-2 border border-slate-300 rounded-md text-sm">
                        <option value="con_iva">con IVA</option>
                        <option value="neto">netos</option>
                    </select>
                </div>

                <h2 className="font-semibold text-slate-700 pt-2">Tarifa por noche</h2>
                {OCCUPANCIES.map((o) => {
                    const net = netOf(vals[o]);
                    return (
                        <div key={o} className="flex flex-wrap items-center gap-3">
                            <label className="w-28 text-sm text-slate-600">{OCCUPANCY_LABELS[o]}</label>
                            <div className="relative">
                                <span className="absolute left-2 top-2 text-slate-400 text-sm">$</span>
                                <input
                                    inputMode="numeric"
                                    value={vals[o] ? fmt(vals[o]) : ""}
                                    placeholder="0"
                                    onChange={(e) => setVals({ ...vals, [o]: digits(e.target.value) })}
                                    className="pl-6 pr-2 py-2 w-40 border border-slate-300 rounded-md text-sm"
                                />
                            </div>
                            <span className="text-xs text-slate-500">
                                Neto <strong>{money(net)}</strong> · Con IVA <strong>{money(withIva(net))}</strong>
                            </span>
                            <span className="text-xs text-slate-400">(guardado: neto {money(saved[o])})</span>
                            {!vals[o] && <span className="text-amber-600 text-xs inline-flex items-center gap-1"><AlertTriangle size={14} /> tarifa sin cargar</span>}
                        </div>
                    );
                })}
            </section>

            <section className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
                <h2 className="font-semibold text-slate-700">Configuración</h2>
                <div className="flex items-center gap-3">
                    <label className="w-40 text-sm text-slate-600">Vigencia (días)</label>
                    <input type="number" min={1} value={validity} onChange={(e) => setValidity(e.target.value)} className="px-2 py-2 w-24 border border-slate-300 rounded-md text-sm" />
                    {provisional && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">provisional</span>}
                </div>
                <div className="flex items-center gap-3">
                    <label className="w-40 text-sm text-slate-600">Modo de cotización</label>
                    <select value={qMode} onChange={(e) => setQMode(e.target.value as any)} className="px-2 py-2 border border-slate-300 rounded-md text-sm">
                        <option value="revision">Con revisión</option>
                        <option value="automatico">Automático</option>
                    </select>
                    <span className="text-xs text-slate-400">Aún no conectado al sitio público.</span>
                </div>
                <div>
                    <label className="text-sm text-slate-600">Condiciones iniciales (una por línea)</label>
                    <textarea rows={4} value={conditions} onChange={(e) => setConditions(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                </div>
            </section>

            {/* Barra fija al pie: Guardar siempre visible */}
            <div className="fixed bottom-0 left-0 right-0 md:left-64 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-3">
                <Link href="/panel/cotizaciones" className={backBtn}><ArrowLeft size={16} /> Volver a cotizaciones</Link>
                <button onClick={save} disabled={saving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar"}
                </button>
            </div>
        </div>
    );
}
