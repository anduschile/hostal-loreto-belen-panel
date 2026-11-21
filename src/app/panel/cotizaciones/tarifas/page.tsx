"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { OCCUPANCIES, OCCUPANCY_LABELS, DEFAULT_CONDITIONS, emptyRates, type RateTable } from "@/lib/quotes/calc";

export default function TarifasPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [rates, setRates] = useState<RateTable>(emptyRates());
    const [validity, setValidity] = useState("7");
    const [provisional, setProvisional] = useState(true);
    const [mode, setMode] = useState<"automatico" | "revision">("revision");
    const [conditions, setConditions] = useState(DEFAULT_CONDITIONS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
                if (rj.ok) setRates(rj.data);
                if (sj.ok) {
                    setValidity(String(sj.data.validity_days));
                    setProvisional(sj.data.validity_provisional);
                    setMode(sj.data.mode);
                    setConditions(sj.data.default_conditions);
                }
            } catch {
                toast.error("Error al cargar tarifas");
            } finally {
                setLoading(false);
            }
        })();
    }, [authLoading, user, role, router]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const [a, b] = await Promise.all([
                fetch("/api/quote-rates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rates) }),
                fetch("/api/quote-settings", {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ validity_days: Number(validity), mode, default_conditions: conditions }),
                }),
            ]);
            const aj = await a.json(), bj = await b.json();
            if (!aj.ok || !bj.ok) throw new Error(aj.error || bj.error);
            setProvisional(bj.data.validity_provisional);
            toast.success("Tarifas y configuración guardadas.");
        } catch (err: any) {
            toast.error(err.message || "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || authLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <Link href="/panel/cotizaciones" className="text-sm text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1"><ArrowLeft size={14} /> Cotizaciones</Link>
                <h1 className="text-2xl font-bold text-slate-800 mt-1">Tarifas de cotización</h1>
                <p className="text-sm text-slate-500">Tarifa neta (sin IVA) por noche. El descuento por empresa se configura en Empresas (tipo y valor de descuento).</p>
            </div>

            <form onSubmit={save} className="space-y-6">
                <section className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
                    <h2 className="font-semibold text-slate-700">Tarifa neta por noche</h2>
                    {OCCUPANCIES.map((o) => (
                        <div key={o} className="flex items-center gap-3">
                            <label className="w-28 text-sm text-slate-600">{OCCUPANCY_LABELS[o]}</label>
                            <div className="relative">
                                <span className="absolute left-2 top-2 text-slate-400 text-sm">$</span>
                                <input type="number" min={0} value={rates[o]} onChange={(e) => setRates({ ...rates, [o]: Number(e.target.value) })}
                                    className="pl-6 pr-2 py-2 w-40 border border-slate-300 rounded-md text-sm" />
                            </div>
                            {!rates[o] && <span className="text-amber-600 text-xs inline-flex items-center gap-1"><AlertTriangle size={14} /> tarifa sin cargar</span>}
                        </div>
                    ))}
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
                        <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="px-2 py-2 border border-slate-300 rounded-md text-sm">
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

                <button disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar"}
                </button>
            </form>
        </div>
    );
}
