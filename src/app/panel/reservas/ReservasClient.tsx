"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Reservation, HostalRoom, Guest } from "@/types/hostal";
import { formatCurrencyCLP, formatDateCL } from "@/lib/formatters";
import { Plus } from "lucide-react";
import ReservationFormModal from "@/components/reservations/ReservationFormModal";

type Props = {
    initialReservations: Reservation[];
    initialRooms: HostalRoom[];
    initialGuests: Guest[];
    initialFrom?: string;
    initialTo?: string;
    initialRoomId?: string;
    initialGuestName?: string;
    initialStatus?: string;
};

export default function ReservasClient({
    initialReservations,
    initialRooms,
    initialGuests,
    initialFrom,
    initialTo,
    initialRoomId,
    initialGuestName,
    initialStatus,
}: Props) {
    const router = useRouter();
    const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
    const [rooms] = useState<HostalRoom[]>(initialRooms);
    const [guests, setGuests] = useState<Guest[]>(initialGuests);

    // Filter State
    const [fromDate] = useState(initialFrom || "");
    const [toDate] = useState(initialTo || "");
    const [roomId] = useState(initialRoomId || "");
    const [guestName] = useState(initialGuestName || "");
    const [status] = useState(initialStatus || "");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

    useEffect(() => {
        setReservations(initialReservations);
    }, [initialReservations]);

    const handleSuccess = () => {
        router.refresh();
        setIsModalOpen(false);
    };

    const handleGuestUpdate = (newGuest: Guest) => {
        setGuests(prev => [...prev, newGuest].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    };

    const openNewReservation = () => {
        setEditingReservation(null);
        setIsModalOpen(true);
    };

    const openEditReservation = (res: Reservation) => {
        setEditingReservation(res);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Estás seguro de eliminar esta reserva?")) return;
        try {
            const res = await fetch(`/api/reservations?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "Error al eliminar");
            setReservations((prev) => prev.filter((r) => r.id !== id));
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            case "checked_in": return "bg-blue-100 text-blue-800";
            case "checked_out": return "bg-gray-100 text-gray-800";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    const friendlyStatus = (s: string) => {
        const map: any = { pending: "Pendiente", confirmed: "Confirmada", checked_in: "Check-in", checked_out: "Check-out", cancelled: "Cancelada", blocked: "Bloqueada" };
        return map[s] || s;
    };

    return (
        <div className="space-y-6">
            {/* ... Filters Bar ... */}
            <div className="bg-white p-4 rounded shadow flex flex-wrap gap-4 items-end justify-between">
                <div>
                    <h2 className="text-lg font-bold mb-2">Filtros</h2>
                    <div className="flex gap-2 text-sm text-gray-500 items-center">
                        <span className="font-medium">Total:</span> {reservations.length} reservas
                        <button onClick={() => router.refresh()} className="text-blue-600 hover:underline ml-2">Actualizar</button>
                    </div>
                </div>
                <button
                    onClick={openNewReservation}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow flex items-center gap-2"
                >
                    <Plus size={18} /> Nueva Reserva
                </button>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b text-xs uppercase text-gray-500">
                            <th className="p-3">ID</th>
                            <th className="p-3">Habitación</th>
                            <th className="p-3">Huésped</th>
                            <th className="p-3">Fechas</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3">Pago / Fact.</th>
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                        {reservations.map((res) => {
                            const rName = rooms.find(r => r.id === res.room_id)?.name || (res as any).room_name || res.room_id;
                            const gName = guests.find(g => g.id === res.guest_id)?.full_name || (res as any).guest_name || res.guest_id;

                            return (
                                <tr key={res.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-400">#{res.id}</td>
                                    <td className="p-3 font-medium">{rName}</td>
                                    <td className="p-3">
                                        <div className="font-medium text-gray-900">{gName}</div>
                                        {res.company_id && <div className="text-xs text-gray-500">Empresa #{res.company_id}</div>}
                                    </td>
                                    <td className="p-3">
                                        <div className="text-xs text-gray-500">IN: <span className="text-gray-900">{formatDateCL(res.check_in)}</span></div>
                                        <div className="text-xs text-gray-500">OUT: <span className="text-gray-900">{formatDateCL(res.check_out)}</span></div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${getStatusColor(res.status)}`}>
                                            {friendlyStatus(res.status)}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-bold">{formatCurrencyCLP(res.total_price)}</div>
                                        {res.invoice_status === 'invoiced' && <div className="text-[10px] text-green-600 font-bold border border-green-200 bg-green-50 inline-block px-1 rounded mt-1">FACT {res.invoice_number}</div>}
                                    </td>
                                    <td className="p-3 text-right space-x-2">
                                        <button onClick={() => openEditReservation(res)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-semibold">Editar</button>
                                        <button onClick={() => handleDelete(res.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs">Borrar</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* SHARED MODAL */}
            <ReservationFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                reservationToEdit={editingReservation}
                rooms={rooms}
                guests={guests}
                onGuestsUpdate={handleGuestUpdate}
            />
        </div>
    );
}
