"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DetailedStats } from "@/lib/data/stats";
import { formatCurrencyCLP } from "@/lib/formatters";

type Props = {
    initialFrom: string;
    initialTo: string;
    initialData: DetailedStats;
};

export default function ReportsClient({
    initialFrom,
    initialTo,
    initialData,
}: Props) {
    const router = useRouter();
    // In a real optimized app, we wouldn't fetch everything client-side again if we just want to navigate,
    // but here we follow the pattern of reloading the page with new params.
    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(false);
    }, [initialData]);

    const handleApply = () => {
        setLoading(true);
        router.push(`/panel/reportes?from=${from}&to=${to}`);
        // The router.push will trigger a server re-render and updated props will come in.
        // We don't need manual fetch here if we rely on Server Components.
        // DashboardClient did manual fetch, but standard Next.js App Router way is query params -> server actions/loader.
    };

    const handleToday = () => {
        // En Chile (America/Santiago). new Date() is local to browser, which we assume is in Chile for the user.
        // But to be robust:
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
        setFrom(today);
        setTo(today);
    };

    const handleThisMonth = () => {
        const now = new Date();
        // First day of current month in Chile
        const firstDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const first = firstDate.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

        const today = now.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
        setFrom(first);
        setTo(today);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8">
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    /* Increase font size for print legibility if needed */
                    body { font-size: 12pt; }
                }
            `}</style>

            {/* --- FILTROS --- */}
            <div className="bg-white p-4 rounded shadow flex flex-wrap gap-4 items-end no-print">
                <div>
                    <label className="block text-sm font-medium">Desde</label>
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="border p-2 rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Hasta</label>
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="border p-2 rounded"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleApply}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Cargando..." : "Generar Reporte"}
                    </button>
                    <button
                        onClick={handleToday}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                    >
                        Hoy
                    </button>
                    <button
                        onClick={handleThisMonth}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                    >
                        Este Mes
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-4 flex items-center gap-2"
                    >
                        <span>🖨️ Exportar PDF</span>
                    </button>
                </div>
            </div>

            {/* --- RESUMEN DE INGRESOS --- */}
            <div className="bg-white p-6 rounded shadow">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Detalle de Ingresos (Pagos)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold text-gray-600 mb-2 border-b pb-1">Por Método de Pago</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2">Método</th>
                                    <th className="py-2 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialData.financial.income_by_method.map((item) => (
                                    <tr key={item.method} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-2 capitalize">{item.method}</td>
                                        <td className="py-2 text-right font-medium">{formatCurrencyCLP(item.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-600 mb-2 border-b pb-1">Por Tipo de Documento</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2">Documento</th>
                                    <th className="py-2 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialData.financial.income_by_document_type.map((item) => (
                                    <tr key={item.document_type} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-2 capitalize">{item.document_type || "N/A"}</td>
                                        <td className="py-2 text-right font-medium">{formatCurrencyCLP(item.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span className="font-bold text-lg">Total Ingresos Periodo</span>
                    <span className="font-bold text-xl text-green-700">{formatCurrencyCLP(initialData.financial.total_income)}</span>
                </div>
            </div>

            {/* --- OCUPACIÓN POR TIPO DE HABITACIÓN --- */}
            <div className="bg-white p-6 rounded shadow">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Ocupación por Tipo de Habitación</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase">
                            <tr>
                                <th className="px-4 py-3">Tipo Habitación</th>
                                <th className="px-4 py-3 text-center">Noches Totales (Disp)</th>
                                <th className="px-4 py-3 text-center">Noches Ocupadas</th>
                                <th className="px-4 py-3 text-right">% Ocupación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {initialData.occupancy_by_room_type.map((row) => (
                                <tr key={row.type} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{row.type}</td>
                                    <td className="px-4 py-3 text-center">{row.total}</td>
                                    <td className="px-4 py-3 text-center">{row.occupied}</td>
                                    <td className="px-4 py-3 text-right font-bold">
                                        {row.rate.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                            {initialData.occupancy_by_room_type.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-4 text-gray-500">No hay datos de habitaciones.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- REPORTE EMPRESAS --- */}
            <div className="bg-white p-6 rounded shadow">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Reporte de Empresas (Facturación Estimada)</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Basado en el valor total de las reservas con check-in en este periodo. Incluye convenios y pagos asociados.
                </p>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase">
                            <tr>
                                <th className="px-4 py-3">Empresa</th>
                                <th className="px-4 py-3 text-center">Reservas (Cant)</th>
                                <th className="px-4 py-3 text-right">Total Facturado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {initialData.all_companies.map((co) => (
                                <tr key={co.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{co.name}</td>
                                    <td className="px-4 py-3 text-center">{co.reservation_count}</td>
                                    <td className="px-4 py-3 text-right font-medium text-blue-700">
                                        {formatCurrencyCLP(co.total_revenue)}
                                    </td>

                                </tr>
                            ))}
                            {initialData.all_companies.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center py-4 text-gray-500">No se encontraron empresas con movimiento en este periodo.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
