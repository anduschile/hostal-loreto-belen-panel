
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Search, Building2, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type Company = {
    id: number;
    name: string;
    rut: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    notes: string;
    discount_type: 'porcentaje' | 'monto_fijo' | 'ninguno';
    discount_value: number;
    credit_days: number;
    is_active: boolean;
};

export default function CompaniesPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<Partial<Company>>({
        name: "",
        rut: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        notes: "",
        discount_type: "ninguno",
        discount_value: 0,
        credit_days: 0,
        is_active: true
    });

    useEffect(() => {
        if (!authLoading) {
            if (!user || (role !== "superadmin" && role !== "recepcion")) {
                toast.error("No tienes permisos para ver esta sección.");
                router.replace("/panel/libro-dia");
            } else {
                fetchCompanies();
            }
        }
    }, [authLoading, user, role, router]);

    const fetchCompanies = async () => {
        setLoadingData(true);
        try {
            const res = await fetch("/api/companies");
            if (!res.ok) throw new Error("Error cargando empresas");
            const data = await res.json();
            setCompanies(data);
        } catch (error) {
            toast.error("Error al cargar listado de empresas");
        } finally {
            setLoadingData(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingCompany(null);
        setFormData({
            name: "",
            rut: "",
            contact_name: "",
            contact_email: "",
            contact_phone: "",
            notes: "",
            discount_type: "ninguno",
            discount_value: 0,
            credit_days: 0,
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (c: Company) => {
        setEditingCompany(c);
        setFormData(c);
        setIsModalOpen(true);
    };

    const handleToggleActive = async (c: Company) => {
        try {
            const newState = !c.is_active;
            const res = await fetch(`/api/companies/${c.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: newState }),
            });
            if (!res.ok) throw new Error("Error al actualizar estado");

            setCompanies(prev => prev.map(item => item.id === c.id ? { ...item, is_active: newState } : item));
            toast.success(`Empresa ${newState ? 'activada' : 'desactivada'}.`);
        } catch (error) {
            toast.error("No se pudo cambiar el estado.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingCompany ? `/api/companies/${editingCompany.id}` : "/api/companies";
            const method = editingCompany ? "PATCH" : "POST";

            if (!formData.name?.trim()) {
                toast.error("El nombre de la empresa es obligatorio.");
                setSaving(false);
                return;
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                // Throwing the extracted error message from API
                throw new Error(data.error || "Error al guardar empresa");
            }

            toast.success(editingCompany ? "Empresa actualizada" : "Empresa creada");
            setIsModalOpen(false);
            fetchCompanies();
        } catch (error: any) { // Type any to catch the Error object
            // Displaying the specific error message
            toast.error(error.message || "Ocurrió un error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || !user) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="text-emerald-600" />
                        Empresas y Convenios
                    </h1>
                    <p className="text-gray-500 text-sm">Gestiona clientes corporativos y sus condiciones.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={18} />
                    Nueva Empresa
                </button>
            </div>

            {loadingData ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="animate-spin text-emerald-600 w-8 h-8" />
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Empresa</th>
                                <th className="px-6 py-4">RUT</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Descuento</th>
                                <th className="px-6 py-4">Crédito</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {companies.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{c.rut || "-"}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900">{c.contact_name}</div>
                                        <div className="text-xs text-gray-500">{c.contact_email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {c.discount_type === 'ninguno' ? 'Ninguno' :
                                            c.discount_type === 'porcentaje' ? `${c.discount_value}%` :
                                                `$${c.discount_value}`}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{c.credit_days > 0 ? `${c.credit_days} días` : "Contado"}</td>
                                    <td className="px-6 py-4">
                                        <span className={`
                                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                        `}>
                                            {c.is_active ? "Activa" : "Inactiva"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleToggleActive(c)}
                                                className={`p-1.5 rounded-md transition-colors ${c.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                                                title={c.is_active ? "Desactivar" : "Activar"}
                                            >
                                                {c.is_active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleOpenEdit(c)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {companies.length === 0 && (
                        <div className="p-10 text-center text-gray-500">No hay empresas registradas.</div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 shrink-0">
                            <h3 className="font-semibold text-gray-900">
                                {editingCompany ? "Editar Empresa" : "Nueva Empresa"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Empresa *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        value={formData.rut}
                                        onChange={e => setFormData({ ...formData, rut: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Días Crédito</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        value={formData.credit_days}
                                        onChange={e => setFormData({ ...formData, credit_days: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Datos de Contacto</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Contacto</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.contact_phone} onChange={e => setFormData({ ...formData, contact_phone: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Condiciones Comerciales</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Descuento</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                            value={formData.discount_type}
                                            onChange={e => setFormData({ ...formData, discount_type: e.target.value as any })}
                                        >
                                            <option value="ninguno">Sin Descuento</option>
                                            <option value="porcentaje">Porcentaje (%)</option>
                                            <option value="monto_fijo">Monto Fijo ($)</option>
                                        </select>
                                    </div>
                                    {formData.discount_type !== 'ninguno' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Descuento</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                value={formData.discount_value}
                                                onChange={e => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas Internas</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="animate-spin w-4 h-4" />}
                                    {editingCompany ? "Guardar Cambios" : "Crear Empresa"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
