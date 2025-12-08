"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, Edit2 } from "lucide-react";
import ReservationFormModal from "@/components/reservations/ReservationFormModal";
import { HostalRoom, Guest } from "@/types/hostal";

type Reservation = {
    id: number;
    check_in: string; // "YYYY-MM-DD"
    check_out: string; // "YYYY-MM-DD"
    status?: string | null;
    total_price?: number | null;
    hostal_rooms?: {
        name: string | null;
        code?: string | null;
    } | null;
    hostal_guests?: {
        full_name: string | null;
    } | null;
};

type Props = {
    initialReservations: Reservation[];
    today: string; // "YYYY-MM-DD"
    rooms: HostalRoom[];
    guests: Guest[];
};

function parseDateSafe(value: string | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

// Reserva se considera dentro del rango si se cruza con [from, to]
function overlapsRange(res: Reservation, from: string, to: string): boolean {
    const fromDate = parseDateSafe(from);
    const toDate = parseDateSafe(to);
    const checkIn = parseDateSafe(res.check_in);
    const checkOut = parseDateSafe(res.check_out);

    if (!fromDate || !toDate || !checkIn || !checkOut) return false;

    // check_in <= to && check_out >= from
    return checkIn <= toDate && checkOut >= fromDate;
}

export default function ReservasList({ initialReservations, today, rooms, guests }: Props) {
    const router = useRouter();
    const [from, setFrom] = useState<string>(today);
    const [to, setTo] = useState<string>(today);
    const [reservations, setReservations] =
        useState<Reservation[]>(initialReservations);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<any>(null); // Ussing any to avoid strict type mismatch with existing partial type

    // Filtro en memoria
    const filtered = useMemo(() => {
        if (!reservations || reservations.length === 0) return [];
        if (!from || !to) return reservations;

        return reservations.filter((res) => overlapsRange(res, from, to));
    }, [reservations, from, to]);

    const handleApply = () => {
        const fromDate = parseDateSafe(from);
        const toDate = parseDateSafe(to);

        if (!fromDate || !toDate) return;

        if (fromDate > toDate) {
            setFrom(to);
            setTo(from);
        }
        // El recalculo lo hace useMemo
    };

    const handleDelete = async (id: number) => {
        const ok = window.confirm(
            `¿Seguro que deseas eliminar la reserva #${id}? Esta acción no se puede deshacer.`
        );
        if (!ok) return;

        try {
            setDeletingId(id);
            const res = await fetch(`/api/reservations?id=${id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "Error al eliminar");

            setReservations((prev) => prev.filter((r) => r.id !== id));
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Error al eliminar la reserva");
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = (res: Reservation) => {
        setEditingReservation(res);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        router.refresh();
        setIsModalOpen(false);
        // We could also re-fetch here if we wanted client-side update without full refresh
    };

    const handleGuestUpdate = () => {
        // Typically we'd update the guests list here, 
        // but for now we rely on server refresh or just let it be.
        router.refresh();
    };

    return (
        <div className="space-y-4">
            {/* FILTROS */}
            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-600 mb-1">
                        Fecha inicio
                    </label>
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-600 mb-1">
                        Fecha fin
                    </label>
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    onClick={handleApply}
                    className="h-[38px] px-5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                    Aplicar
                </button>
            </div>

            {/* TEXTO DE RANGO */}
            <p className="text-xs text-gray-500">
                Mostrando reservas desde{" "}
                <span className="font-semibold">{from || "-"}</span> hasta{" "}
                <span className="font-semibold">{to || "-"}</span>.
            </p>

            {/* LISTA / VACÍO */}
            {(!filtered || filtered.length === 0) && (
                <div className="border rounded-xl px-4 py-8 text-center text-sm text-gray-500 bg-white">
                    No hay reservas en este rango.
                </div>
            )}

            {filtered && filtered.length > 0 && (
                <div className="space-y-3">
                    {filtered.map((res) => {
                        const roomName =
                            res.hostal_rooms?.name ??
                            (res.hostal_rooms?.code
                                ? `Habitación ${res.hostal_rooms.code}`
                                : "Sin habitación");
                        const guestName = res.hostal_guests?.full_name ?? "Sin huésped";

                        const inLabel = parseDateSafe(res.check_in)
                            ? format(parseDateSafe(res.check_in)!, "dd-MM-yyyy", {
                                locale: es,
                            })
                            : res.check_in;

                        const outLabel = parseDateSafe(res.check_out)
                            ? format(parseDateSafe(res.check_out)!, "dd-MM-yyyy", {
                                locale: es,
                            })
                            : res.check_out;

                        const isDeleting = deletingId === res.id;

                        return (
                            <div
                                key={res.id}
                                className="border rounded-xl bg-white px-4 py-3 shadow-sm flex flex-col gap-2"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {guestName}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {roomName} — {inLabel} → {outLabel}
                                        </div>
                                        {res.status && (
                                            <div className="text-[11px] uppercase tracking-wide text-gray-400 mt-1">
                                                Estado: {res.status}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(res)}
                                            className="text-blue-600 hover:bg-blue-50 rounded-full p-1 flex items-center justify-center"
                                            title="Editar reserva"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(res.id)}
                                            disabled={isDeleting}
                                            className="text-red-600 hover:bg-red-50 rounded-full p-1 flex items-center justify-center disabled:opacity-50"
                                            title="Eliminar reserva"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {typeof res.total_price === "number" && (
                                    <div className="text-[11px] text-gray-500">
                                        Total:{" "}
                                        <span className="font-semibold">
                                            ${res.total_price.toLocaleString("es-CL")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {/* MODAL EDICIÓN */}
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
