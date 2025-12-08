"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSummary } from "@/lib/data/stats";
import { formatCurrencyCLP } from "@/lib/formatters";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";

type Props = {
    initialFrom: string;
    initialTo: string;
    initialData: DashboardSummary;
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function DashboardClient({
    initialFrom,
    initialTo,
    initialData,
}: Props) {
    const router = useRouter();
    const [data, setData] = useState<DashboardSummary>(initialData);
    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [loading, setLoading] = useState(false);

    const handleApply = async () => {
        setLoading(true);
        router.replace(`/panel/dashboard?from=${from}&to=${to}`);

        try {
            const res = await fetch(`/api/stats/dashboard?from=${from}&to=${to}`);
            const json = await res.json();
            if (json.ok) {
                setData(json.data);
            } else {
                alert("Error cargando datos: " + json.error);
            }
        } catch (e) {
            alert("Error de red");
        } finally {
            setLoading(false);
        }
    };

    const handleThisMonth = () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        setFrom(first);
        setTo(today);
    };

    return (
        <div className="space-y-8">
            {/* Filtros */}
            <div className="bg-white p-4 rounded shadow flex flex-wrap gap-4 items-end">
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
                <button
                    onClick={handleApply}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Cargando..." : "Aplicar Filtros"}
                </button>
                <button
                    onClick={handleThisMonth}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                    Este Mes
                </button>
            </div>

            {/* KPIs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-sm uppercase">Ingresos Totales</h3>
                    <p className="text-2xl font-bold">{formatCurrencyCLP(data.financial.total_income)}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-sm uppercase">Ocupación Actual</h3>
                    <p className="text-2xl font-bold">{data.occupancy.occupancy_rate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-400">
                        {data.occupancy.occupied_rooms} de {data.occupancy.total_rooms} habs.
                    </p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-purple-500">
                    <h3 className="text-gray-500 text-sm uppercase">RevPAR (Est.)</h3>
                    <p className="text-xl font-bold">
                        {formatCurrencyCLP(data.financial.rev_par)}
                    </p>
                    <p className="text-xs text-gray-400">Ingreso prom x hab disp</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
                    <h3 className="text-gray-500 text-sm uppercase">Transacciones</h3>
                    <p className="text-2xl font-bold">
                        {data.financial.transaction_count}
                        <span className="text-sm font-normal text-gray-400 ml-1">pagos reg.</span>
                    </p>
                </div>
            </div>

            {/* Gráficos Primera Fila */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Evolución Ingresos */}
                <div className="bg-white p-4 rounded shadow h-80">
                    <h3 className="text-lg font-bold mb-4">Evolución de Ingresos</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.financial.daily_income}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => val.slice(8)} // Show day only "DD"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(val: number) => formatCurrencyCLP(val)} />
                            <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Ingresos" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Evolución Ocupación */}
                <div className="bg-white p-4 rounded shadow h-80">
                    <h3 className="text-lg font-bold mb-4">Evolución Ocupación (%)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.occupancy.daily_occupancy}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => val.slice(8)}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(val: number) => `${val}%`} />
                            <Line type="monotone" dataKey="occupancy_rate" stroke="#82ca9d" name="Ocupación" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Distribución de Pagos & Top Empresas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded shadow h-80">
                    <h3 className="text-lg font-bold mb-4">Ingresos por Método</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.financial.income_by_method}
                                dataKey="amount"
                                nameKey="method"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                label={({ name, percent }) => percent > 0.05 ? name : ''}
                            >
                                {data.financial.income_by_method.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(val: number) => formatCurrencyCLP(val)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top 5 Empresas */}
                <div className="bg-white p-4 rounded shadow h-80">
                    <h3 className="text-lg font-bold mb-4">Top 5 Empresas (Facturación)</h3>
                    {data.top_companies && data.top_companies.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={data.top_companies}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip formatter={(val: number) => formatCurrencyCLP(val)} />
                                <Bar dataKey="total_revenue" fill="#82ca9d" name="Ingresos" barSize={20} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 italic">
                            No hay datos de empresas en este periodo.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
