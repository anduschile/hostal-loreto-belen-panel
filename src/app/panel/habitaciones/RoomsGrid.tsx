"use client";

import { useState } from "react";
import { HostalRoom } from "@/types/hostal";
import RoomCard from "./RoomCard";
import RoomFormModal from "@/components/habitaciones/RoomFormModal";
import { toast } from "sonner";

type Props = {
    initialRooms: HostalRoom[];
};

export default function RoomsGrid({ initialRooms }: Props) {
    const [rooms, setRooms] = useState<HostalRoom[]>(initialRooms);
    const [editingRoom, setEditingRoom] = useState<HostalRoom | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const openNewRoom = () => {
        setEditingRoom(null);
        setIsModalOpen(true);
    };

    const openEditRoom = (room: HostalRoom) => {
        setEditingRoom(room);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setIsModalOpen(false);
        setEditingRoom(null);
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        // Optimista
        setRooms((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: status as any } : r))
        );

        try {
            const res = await fetch("/api/rooms", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status }),
            });

            if (!res.ok) {
                throw new Error("Error al actualizar estado de habitación");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error al actualizar estado");
        }
    };

    const handleDeleteRoom = async (id: number) => {
        if (!confirm("¿Eliminar esta habitación? Esta acción es irreversible.")) return;

        const toastId = toast.loading("Eliminando habitación...");

        try {
            const res = await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || res.statusText || "Error al eliminar");
            }

            setRooms((prev) => prev.filter((r) => r.id !== id));
            toast.success("Habitación eliminada correctamente", { id: toastId });

            setIsModalOpen(false);
            setEditingRoom(null);
        } catch (e: any) {
            console.error(e);
            let msg = "No se pudo eliminar la habitación";
            // Check for specific keywords typically returned by Supabase/Postgres
            // or if we threw it ourselves with response text
            if (e.message?.includes("foreign key") || e.message?.includes("constraint") || e.message?.includes("reservas")) {
                msg = "No es posible eliminar esta habitación porque tiene reservas asociadas. Usa el estado 'Archivada'.";
            }
            toast.error(msg, { id: toastId, duration: 5000 });
        }
    };

    const handleSaveRoom = async (payload: {
        id?: number;
        name: string;
        code: string;
        room_type: string;
        capacity_adults: number;
        capacity_children: number;
        annex: string | null;
        notes: string | null;
        status: string;
        default_rate: number | null;
    }) => {
        setSaving(true);
        try {
            const method = payload.id ? "PUT" : "POST";

            const res = await fetch("/api/rooms", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || !json.ok) {
                throw new Error(json.error || "Error al guardar habitación");
            }

            const updated: HostalRoom = json.data;

            setRooms((prev) => {
                const exists = prev.some((r) => r.id === updated.id);
                const next = exists
                    ? prev.map((r) => (r.id === updated.id ? updated : r))
                    : [...prev, updated];

                // Ordenamos por sort_order si existe, si no por código numérico o id
                return next.sort((a, b) => {
                    const soA = (a as any).sort_order ?? 9999;
                    const soB = (b as any).sort_order ?? 9999;
                    if (soA !== soB) return soA - soB;

                    const codeA = parseInt(a.code || "0", 10);
                    const codeB = parseInt(b.code || "0", 10);
                    if (!isNaN(codeA) && !isNaN(codeB) && codeA !== codeB) {
                        return codeA - codeB;
                    }

                    return a.id - b.id;
                });
            });

            setIsModalOpen(false);
            setEditingRoom(null);
            toast.success(payload.id ? "Habitación actualizada" : "Habitación creada");
        } catch (err) {
            console.error(err);
            toast.error("No se pudo guardar la habitación");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header superior */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Habitaciones</h1>
                    <p className="text-sm text-gray-500">
                        Administra la información y el estado de las habitaciones del
                        hostal.
                    </p>
                </div>

                <button
                    onClick={openNewRoom}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 transition-colors"
                >
                    + Nueva habitación
                </button>
            </div>

            {/* Resumen pequeño */}
            <p className="text-xs text-gray-500">
                Total habitaciones:{" "}
                <span className="font-semibold text-gray-700">{rooms.length}</span>
            </p>

            {/* Grid de tarjetas */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {rooms.map((room) => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        onEdit={openEditRoom}
                        onUpdateStatus={handleUpdateStatus}
                    />
                ))}
            </div>

            {/* Modal de edición / creación */}
            <RoomFormModal
                open={isModalOpen}
                room={editingRoom}
                onClose={closeModal}
                onSave={handleSaveRoom}
                onDelete={editingRoom ? () => handleDeleteRoom(editingRoom.id) : undefined}
                saving={saving}
            />
        </div>
    );
}
