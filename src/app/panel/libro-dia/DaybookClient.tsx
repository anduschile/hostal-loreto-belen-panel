"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DaybookEntry } from "@/lib/data/daybook";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Clock, ArrowRight, LogIn, LogOut, Coffee } from "lucide-react";

type Props = {
    initialDate: string;
    entries: DaybookEntry[];
};

export default function DaybookClient({ initialDate, entries }: Props) {
    const router = useRouter();
    const [date, setDate] = useState(initialDate);
    const [updatingMap, setUpdatingMap] = useState<Record<number, boolean>>({});

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDate(newDate);
        router.push(`/panel/libro-dia?date=${newDate}`);
    };

    // --- ACCIONES ---

    const updateStatus = async (id: number, newStatus: string, actionName: string) => {
        if (updatingMap[id]) return;

        // Optimistic update prevention
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
            router.refresh(); // Refresh server data
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Error al actualizar", { id: toastId });
        } finally {
            setUpdatingMap(prev => ({ ...prev, [id]: false }));
        }
    };

    // --- CLASIFICACIÓN ---
    // Llegan: CheckIn == Date AND Status != checked_in/out
    const arrivals = entries.filter(r =>
        r.check_in === date &&
        (r.status === "pending" || r.status === "confirmed")
    );

    // Salen: CheckOut == Date AND Status != checked_out (usually checked_in)
    const departures = entries.filter(r =>
        r.check_out === date &&
        (r.status === "checked_in" || r.status === "confirmed")
    );

    // Hospedados: 
    // Opción A: CheckIn < Date < CheckOut AND Status = checked_in
    // Opción B: CheckIn == Date AND Status = checked_in (ya llegaron hoy)
    const staying = entries.filter(r => {
        const isStayingThrough = r.check_in < date && r.check_out > date;
        const arrivedToday = r.check_in === date && r.status === "checked_in";
        const stayingTonightButDepartingTomorrowOrLater = r.status === "checked_in" && r.check_out > date; // Covers broad "In House"

        // Simplificación: "Hospedados" son los que están dentro (checked_in) Y NO salen hoy (porque esos van en Salen).
        // Si salen hoy, están en "Salen".
        // Si llegaron hoy (check_in=today) y ya hicieron check-in, deberían estar en "Hospedados" o "Llegan"? Ya no "Llegan", pues ya llegaron.
        // Entonces: Status 'checked_in' AND check_out > date.

        return r.status === "checked_in" && r.check_out > date;
    });

    // NOTA: Si status es "confirmed" pero check_in < date, es un "No Show" o olvido de check-in. 
    // Podríamos mostrarlos en "Llegan (Atrasado)" o similar, pero por ahora seguimos lógica simple.

    const renderCard = (r: DaybookEntry, type: "arrival" | "departure" | "stay") => {
        const isUpdating = updatingMap[r.id];

        return (
            <div key={r.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                {/* Status Stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${r.status === "checked_in" ? "bg-blue-500" :
                    r.status === "confirmed" ? "bg-green-500" : "bg-yellow-500"
                    }`} />

                <div className="flex justify-between items-start pl-2">
                    <div>
                        <span className="text-xs font-bold text-gray-500">
                            {r.room_name}
                            <span className="font-normal text-gray-400 mx-1">•</span>
                            {r.id}
                        </span>
                        <h3 className="font-bold text-gray-900 line-clamp-1">{r.guest_name || "Sin Huésped"}</h3>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${r.status === "confirmed" ? "bg-green-50 border-green-200 text-green-700" :
                        r.status === "checked_in" ? "bg-blue-50 border-blue-200 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                        }`}>
                        {r.status}
                    </span>
                </div>

                <div className="pl-2 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span>{r.adults} Ad. {r.children ? `+ ${r.children} Ni.` : ""}</span>
                    </div>

                    {type === "arrival" && r.arrival_time && (
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-orange-400" />
                            <span>Llegada: {r.arrival_time}</span>
                        </div>
                    )}
                    {(type === "departure" || type === "stay") && r.breakfast_time && (
                        <div className="flex items-center gap-2">
                            <Coffee size={14} className="text-amber-600" />
                            <span>Desayuno: {r.breakfast_time}</span>
                        </div>
                    )}

                    {r.notes && (
                        <p className="bg-yellow-50 p-1.5 rounded text-yellow-800 mt-1 italic border border-yellow-100">
                            "{r.notes}"
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="pl-2 pt-2 mt-auto">
                    {type === "arrival" && (
                        <button
                            onClick={() => updateStatus(r.id, "checked_in", "Check-in")}
                            disabled={isUpdating}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <LogIn size={16} /> Marcar Check-in
                        </button>
                    )}

                    {type === "departure" && (
                        <button
                            onClick={() => updateStatus(r.id, "checked_out", "Check-out")}
                            disabled={isUpdating}
                            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <LogOut size={16} /> Marcar Check-out
                        </button>
                    )}

                    {type === "stay" && (
                        <div className="text-center py-1 text-xs text-gray-400">
                            En casa
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Libro del Día</h1>
                    <p className="text-gray-500 text-sm capitalize">
                        {format(new Date(date + "T00:00:00"), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>
                <div>
                    <input
                        type="date"
                        value={date}
                        onChange={handleDateChange}
                        className="border rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Kanbas Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LLEGAN */}
                <div className="space-y-3">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2 pb-2 border-b-2 border-green-500">
                        <LogIn className="text-green-600" size={20} />
                        Llegan ({arrivals.length})
                    </h2>
                    <div className="space-y-3">
                        {arrivals.map(r => renderCard(r, "arrival"))}
                        {arrivals.length === 0 && <p className="text-sm text-gray-400 italic py-4 text-center">No hay llegadas pendientes hoy.</p>}
                    </div>
                </div>

                {/* SALEN */}
                <div className="space-y-3">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2 pb-2 border-b-2 border-orange-500">
                        <LogOut className="text-orange-600" size={20} />
                        Salen ({departures.length})
                    </h2>
                    <div className="space-y-3">
                        {departures.map(r => renderCard(r, "departure"))}
                        {departures.length === 0 && <p className="text-sm text-gray-400 italic py-4 text-center">No hay salidas pendientes hoy.</p>}
                    </div>
                </div>

                {/* HOSPEDADOS */}
                <div className="space-y-3">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2 pb-2 border-b-2 border-blue-500">
                        <Coffee className="text-blue-600" size={20} />
                        Hospedados ({staying.length})
                    </h2>
                    <div className="space-y-3">
                        {staying.map(r => renderCard(r, "stay"))}
                        {staying.length === 0 && <p className="text-sm text-gray-400 italic py-4 text-center">No hay huéspedes alojados.</p>}
                    </div>
                </div>

            </div>
        </div>
    );
}
