
import { Building2 } from "lucide-react";

export default function EmpresasPage() {
    return (
        <div className="max-w-4xl mx-auto mt-10 space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-100/50">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Building2 size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Empresas y convenios</h1>
                    <p className="text-gray-500 text-sm">Gestión de clientes corporativos</p>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">
                    Aquí podrás administrar las empresas, instituciones y convenios asociados al
                    Hostal Loreto Belén. Este módulo centralizará la gestión de tarifas diferenciadas,
                    condiciones de pago específicas y la facturación agrupada por empresa.
                </p>

                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">Módulo en construcción</h3>
                    <p className="text-sm text-blue-700">
                        Próximamente se habilitará el registro de nuevas empresas, la asignación de
                        tarifas preferenciales y la generación de reportes de consumo corporativo.
                    </p>
                </div>
            </div>
        </div>
    );
}
