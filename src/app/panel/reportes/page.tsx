
import { BarChart3 } from "lucide-react";

export default function ReportesPage() {
    return (
        <div className="max-w-4xl mx-auto mt-10 space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-100/50">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                    <BarChart3 size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reportes y análisis</h1>
                    <p className="text-gray-500 text-sm">Inteligencia de negocios</p>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">
                    En esta sección se consolidarán los indicadores clave de desempeño del Hostal Loreto Belén.
                    Podrás visualizar métricas detalladas de ocupación histórica, ingresos por tipo de habitación,
                    y tendencias de reservas.
                </p>

                <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-emerald-900 mb-1">Módulo en construcción</h3>
                    <p className="text-sm text-emerald-700">
                        Más adelante se incorporarán gráficos interactivos, filtros avanzados por rango de fechas
                        y la capacidad de exportar datos en formato Excel/PDF para apoyar la toma de decisiones estratégicas.
                    </p>
                </div>
            </div>
        </div>
    );
}
