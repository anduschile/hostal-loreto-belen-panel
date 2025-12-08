"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DaybookEntry } from "@/lib/data/daybook";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Clock, LogIn, LogOut, Coffee, FileText, CheckSquare, Pencil, Save, X } from "lucide-react";

type Props = {
    initialDate: string;
    entries: DaybookEntry[];
};

export default function DaybookClient({ initialDate, entries }: Props) {
    const router = useRouter();
    const [date, setDate] = useState(initialDate);
    const [updatingMap, setUpdatingMap] = useState<Record<number, boolean>>({});

    // Invoice Number Editing State
    const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
    const [tempInvoiceNum, setTempInvoiceNum] = useState("");

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDate(newDate);
        router.push(`/panel/libro-dia?date=${newDate}`);
    };

    // --- ACCIONES DE ESTADO (Check-in / Check-out) ---
    const updateStatus = async (id: number, newStatus: string, actionName: string) => {
        if (updatingMap[id]) return;

        setUpdatingMap(prev => ({ ...prev, [id]: true }));
        const toastId = toast.loading(`Procesando ${actionName}...`);

        try {
            const res = await fetch(`/api/reservations/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al actualizar");
            }

            toast.success(`${actionName} completado`, { id: toastId });
            router.refresh();
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Error al actualizar", { id: toastId });
        } finally {
            setUpdatingMap(prev => ({ ...prev, [id]: false }));
        }
    };

    // --- ACCIONES DE FACTURACIÓN ---
    const handleMarkInvoiced = async (id: number) => {
        if (updatingMap[id]) return;
        /*
          // Confirmation removed for speed, user requested "puede ser sin confirmación".
          // If needed: if (!confirm("¿Marcar como facturada?")) return;
        */

        setUpdatingMap(prev => ({ ...prev, [id]: true }));
        const toastId = toast.loading("Actualizando facturación...");

        try {
            const today = new Date().toISOString().split("T")[0]; // Local simplified
            const res = await fetch(`/api/reservations/${id}/invoice`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoice_status: "invoiced",
                    invoice_date: today
                })
            });

            if (!res.ok) throw new Error("Error al actualizar");

            toast.success("Reserva marcada como facturada", { id: toastId });
            router.refresh();
        } catch (e: any) {
            toast.error("No se pudo actualizar", { id: toastId });
        } finally {
            setUpdatingMap(prev => ({ ...prev, [id]: false }));
        }
    };

    const startEditingInvoice = (r: DaybookEntry) => {
        setEditingInvoiceId(r.id);
        setTempInvoiceNum(r.invoice_number || "");
    };

    const cancelEditingInvoice = () => {
        setEditingInvoiceId(null);
        setTempInvoiceNum("");
    };

    const saveInvoiceNumber = async (id: number) => {
        setUpdatingMap(prev => ({ ...prev, [id]: true }));
        const toastId = toast.loading("Guardando N° Factura...");
        try {
            const res = await fetch(`/api/reservations/${id}/invoice`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoice_number: tempInvoiceNum
                })
            });

            if (!res.ok) throw new Error("Error API");

            toast.success("N° Factura actualizado", { id: toastId });
            setEditingInvoiceId(null);
            router.refresh();
        } catch (e) {
            toast.error("Error al guardar N°", { id: toastId });
        } finally {
            setUpdatingMap(prev => ({ ...prev, [id]: false }));
        }
    };


    // --- CLASIFICACIÓN ---
    const arrivals = entries.filter(r =>
        r.check_in === date &&
        (r.status === "pending" || r.status === "confirmed")
    );

    const departures = entries.filter(r =>
        r.check_out === date &&
        (r.status === "checked_in" || r.status === "confirmed")
    );

    const staying = entries.filter(r => {
        return r.status === "checked_in" && r.check_out > date;
    });

    const formatDateShort = (isoDate: string) => {
        if (!isoDate) return "-";
        return format(parseISO(isoDate), "d 'de' MMMM", { locale: es });
    };

    const renderCard = (r: DaybookEntry, type: "arrival" | "departure" | "stay") => {
        const isUpdating = updatingMap[r.id];
        const isEditingInv = editingInvoiceId === r.id;
        const isInvoiced = r.invoice_status === "invoiced";

        return (
            <div key={r.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                {/* Status Stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${r.status === "checked_in" ? "bg-blue-500" :
                    r.status === "confirmed" ? "bg-green-500" : "bg-yellow-500"
                    }`} />

                {/* Header: Room & Guest */}
                <div className="pl-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-bold text-gray-500">
                                {r.room_name}
                                <span className="font-normal text-gray-400 mx-1">•</span>
                                {r.id}
                            </span>
                            <h3 className="font-bold text-gray-900 line-clamp-1 text-base">
                                {r.guest_name || "Sin Huésped"}
                            </h3>
                            {/* EMPRESA */}
                            <p className="text-xs text-gray-500 font-medium">
                                {r.company_name ? `Empresa: ${r.company_name}` : "Particular"}
                            </p>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${r.status === "confirmed" ? "bg-green-50 border-green-200 text-green-700" :
                            r.status === "checked_in" ? "bg-blue-50 border-blue-200 text-blue-700" :
                                "bg-gray-100 text-gray-600"
                            }`}>
                            {r.status}
                        </span>
                    </div>
                </div>

                {/* INFO: Pax, Dates, Times */}
                <div className="pl-2 text-xs text-gray-600 space-y-1 border-t border-b py-2 border-gray-100">
                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span>{r.adults} Ad. {r.children ? `+ ${r.children} Ni.` : ""}</span>
                    </div>
                    {/* FECHAS */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                            <span className="text-gray-400 block text-[10px]">Ingreso</span>
                            <span className="font-medium text-gray-700">{formatDateShort(r.check_in)}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[10px]">Salida</span>
                            <span className="font-medium text-gray-700">{formatDateShort(r.check_out)}</span>
                        </div>
                    </div>

                    {type === "arrival" && r.arrival_time && (
                        <div className="flex items-center gap-2 mt-1">
                            <Clock size={14} className="text-orange-400" />
                            <span>Llegada: {r.arrival_time}</span>
                        </div>
                    )}
                    {(type === "departure" || type === "stay") && r.breakfast_time && (
                        <div className="flex items-center gap-2 mt-1">
                            <Coffee size={14} className="text-amber-600" />
                            <span>Desayuno: {r.breakfast_time}</span>
                        </div>
                    )}

                    {r.notes && (
                        <p className="bg-yellow-50 p-1.5 rounded text-yellow-800 mt-1 italic border border-yellow-100 line-clamp-2">
                            "{r.notes}"
                        </p>
                    )}
                </div>

                {/* FACTURACIÓN */}
                <div className="pl-2 pt-1">
                    <div className="flex items-center justify-between mb-2">
                        {/* BADGE */}
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${isInvoiced
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                            }`}>
                            {isInvoiced ? (
                                <>
                                    <CheckSquare size={10} /> Facturada
                                </>
                            ) : (
                                "Pendiente Factura"
                            )}
                        </div>

                        {/* BTN MARCAR */}
                        {!isInvoiced && (
                            <button
                                onClick={() => handleMarkInvoiced(r.id)}
                                disabled={isUpdating}
                                className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 font-semibold transition-colors disabled:opacity-50"
                                title="Marcar como facturada ahora"
                            >
                                Marcar OK
                            </button>
                        )}
                    </div>

                    {/* N° FACTURA */}
                    <div className="flex items-center gap-2 h-7">
                        <FileText size={14} className="text-gray-400" />
                        {isEditingInv ? (
                            <div className="flex items-center gap-1 flex-1">
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full text-xs border border-blue-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                                    value={tempInvoiceNum}
                                    placeholder="N°..."
                                    onChange={(e) => setTempInvoiceNum(e.target.value)}
                                    title="Escriba el número de factura"
                                />
                                <button onClick={() => saveInvoiceNumber(r.id)} className="text-green-600 hover:bg-green-50 p-0.5 rounded">
                                    <Save size={14} />
                                </button>
                                <button onClick={cancelEditingInvoice} className="text-red-500 hover:bg-red-50 p-0.5 rounded">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div
                                className="flex-1 flex items-center gap-2 cursor-pointer group/invoice rounded hover:bg-gray-50 px-1 py-0.5 -ml-1"
                                onClick={() => startEditingInvoice(r)}
                                title="Clic para editar número de factura"
                            >
                                <span className={`text-xs ${r.invoice_number ? "text-gray-700 font-medium" : "text-gray-400 italic"}`}>
                                    {r.invoice_number || "Sin N° Factura..."}
                                </span>
                                <Pencil size={10} className="text-gray-300 group-hover/invoice:text-gray-500 opacity-0 group-hover/invoice:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </div>
                </div>

                {/* MAIN ACTIONS (Checkin/Checkout) */}
                <div className="pl-2 pt-2 mt-auto border-t border-gray-100">
                    {type === "arrival" && (
                        <button
                            onClick={() => updateStatus(r.id, "checked_in", "Check-in")}
                            disabled={isUpdating}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            <LogIn size={16} /> Check-in
                        </button>
                    )}

                    {type === "departure" && (
                        <button
                            onClick={() => updateStatus(r.id, "checked_out", "Check-out")}
                            disabled={isUpdating}
                            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            <LogOut size={16} /> Check-out
                        </button>
                    )}

                    {type === "stay" && (
                        <div className="text-center py-1 text-xs text-gray-400 bg-gray-50 rounded">
                            Hospedado
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Libro del Día</h1>
                    <p className="text-gray-500 text-sm capitalize">
                        {format(parseISO(date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>
                <div>
                    <input
                        type="date"
                        value={date}
                        onChange={handleDateChange}
                        className="border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                </div>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LLEGAN */}
                <div className="space-y-3">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2 pb-2 border-b-2 border-green-500 bg-white p-2 rounded-t-lg shadow-sm">
                        <LogIn className="text-green-600" size={20} />
                        Llegan ({arrivals.length})
                    </h2>
                    <div className="space-y-3">
                        {arrivals.map(r => renderCard(r, "arrival"))}
                        {arrivals.length === 0 && <p className="text-sm text-gray-400 italic py-8 text-center bg-gray-50 rounded border border-dashed">No hay llegadas pendientes hoy.</p>}
                    </div>
                </div>

                {/* SALEN */}
                <div className="space-y-3">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2 pb-2 border-b-2 border-orange-500 bg-white p-2 rounded-t-lg shadow-sm">
                        <LogOut className="text-orange-600" size={20} />
                        Salen ({departures.length})
                    </h2>
                    <div className="space-y-3">
                        {departures.map(r => renderCard(r, "departure"))}
                        {departures.length === 0 && <p className="text-sm text-gray-400 italic py-8 text-center bg-gray-50 rounded border border-dashed">No hay salidas pendientes hoy.</p>}
                    </div>
                </div>

                {/* HOSPEDADOS */}
                <div className="space-y-3">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2 pb-2 border-b-2 border-blue-500 bg-white p-2 rounded-t-lg shadow-sm">
                        <Coffee className="text-blue-600" size={20} />
                        Hospedados ({staying.length})
                    </h2>
                    <div className="space-y-3">
                        {staying.map(r => renderCard(r, "stay"))}
                        {staying.length === 0 && <p className="text-sm text-gray-400 italic py-8 text-center bg-gray-50 rounded border border-dashed">No hay huéspedes alojados.</p>}
                    </div>
                </div>

            </div>
        </div>
    );
}
