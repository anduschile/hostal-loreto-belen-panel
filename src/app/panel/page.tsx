import { getDashboardStats } from "@/lib/data/dashboard";
import { formatCurrencyCLP } from "@/lib/formatters";
import {
    Building2,
    Users,
    DollarSign
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    // Determine "today" in server time (or use a fixed timezone if required, but local server time is usually acceptable for this context unless specified otherwise).
    // The user asked for "Fecha de hoy (en zona horaria del servidor)".
    // For simplicity and to match the user's "local time" which is -03:00, we'll try to get it right.
    // Actually, standard Date() in node is UTC usually, but we need YYYY-MM-DD.
    // Just `new Date().toISOString().split('T')[0]` gives UTC date.
    // If the server is UTC, and it's 23:00 in Chile (-3), it's 02:00 next day UTC. 
    // Ideally we shift to Chile time.

    const chileTime = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
    const dateObj = new Date(chileTime);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    const stats = await getDashboardStats(today);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Resumen Diario</h1>
                    <p className="text-gray-500">
                        Vista general del {day}/{month}/{year}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Ocupación */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide">Ocupación Hoy</h3>
                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                <Building2 size={24} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900">{stats.occupancyTodayPercent}%</span>
                            <span className="text-sm text-gray-400 font-medium">de {stats.totalRooms} habitaciones</span>
                        </div>
                        <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(stats.occupancyTodayPercent, 100)}%` }}
                            ></div>
                        </div>
                        <p className="mt-2 text-xs text-blue-600 font-medium">
                            {stats.occupiedRoomsToday} habitaciones ocupadas
                        </p>
                    </div>
                </div>

                {/* Card 2: Check-ins Pendientes */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide">Pendiente Check-in</h3>
                            <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                                <Users size={24} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900">{stats.pendingCheckinsToday}</span>
                            <span className="text-sm text-gray-400 font-medium">reservas</span>
                        </div>
                        <p className="mt-4 text-xs text-gray-500">
                            Deben llegar hoy y aún no tienen Check-In.
                        </p>
                    </div>
                </div>

                {/* Card 3: Ingresos Mes */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide">Ingresos Mes Actual</h3>
                            <div className="bg-green-50 p-2 rounded-lg text-green-600">
                                <DollarSign size={24} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900">{formatCurrencyCLP(stats.monthlyIncome)}</span>
                        </div>
                        <p className="mt-4 text-xs text-gray-500">
                            Suma de todos los pagos registrados en este mes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
