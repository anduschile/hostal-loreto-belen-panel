"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HostalRoom } from "@/types/hostal";
import { formatCurrencyCLP } from "@/lib/formatters";
import { Users, Edit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import RoomFormModal from "@/components/habitaciones/RoomFormModal";

type Props = {
    initialRooms: HostalRoom[];
};

export default function RoomsClient({ initialRooms }: Props) {
    const router = useRouter();
    const [rooms, setRooms] = useState<HostalRoom[]>(initialRooms);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<HostalRoom | null>(null);

    // States for UX
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const filtered = rooms.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.room_type.toLowerCase().includes(search.toLowerCase())
    );

    const openNew = () => {
        setEditingRoom(null);
        setIsModalOpen(true);
    };

    const openEdit = (room: HostalRoom) => {
        setEditingRoom(room);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar esta habitación?")) return;

        const toastId = toast.loading("Eliminando habitación...");
        setIsDeleting(true);

        try {
            const res = await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");

            setRooms(prev => prev.filter(r => r.id !== id));
            toast.success("Habitación eliminada correctamente", { id: toastId });
            router.refresh();
            setIsModalOpen(false);
        } catch (e: any) {
            toast.error(e.message || "No se pudo eliminar la habitación", { id: toastId });
            console.error(e);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async (payload: any) => {
        const toastId = toast.loading(editingRoom ? "Guardando cambios..." : "Creando habitación...");
        setIsSubmitting(true);

        try {
            const dataToSend = {
                name: payload.name,
                code: payload.code,
                room_type: payload.room_type,
                capacity_adults: payload.capacity_adults,
                capacity_children: payload.capacity_children,
                default_rate: payload.default_rate,
                status: payload.status,
                notes: payload.notes,
                annex: payload.annex,
                currency: "CLP"
            };

            let res;
            if (editingRoom) {
                // Update
                res = await fetch("/api/rooms", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingRoom.id, ...dataToSend })
                });
            } else {
                // Create
                res = await fetch("/api/rooms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSend)
                });
            }

            const json = await res.json();
            if (!json.ok) throw new Error(json.error);

            if (editingRoom) {
                setRooms(prev => prev.map(r => r.id === json.data.id ? json.data : r));
                toast.success("Habitación actualizada", { id: toastId });
            } else {
                setRooms(prev => [...prev, json.data].sort((a, b) => a.id - b.id));
                toast.success("Habitación creada con éxito", { id: toastId });
            }
            setIsModalOpen(false);
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Error al guardar la habitación", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusColors: any = {
        disponible: "bg-green-100 text-green-800",
        ocupada: "bg-red-100 text-red-800",
        mantenimiento: "bg-yellow-100 text-yellow-800",
        limpieza: "bg-blue-100 text-blue-800",
        fuera_servicio: "bg-gray-200 text-gray-800"
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between mb-4">
                <input
                    type="text"
                    placeholder="Buscar habitación..."
                    className="border p-2 rounded w-64"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
                    <Plus size={18} /> Nueva Habitación
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b bg-gray-50 text-gray-600 uppercase text-xs">
                            <th className="p-3">ID</th>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Capacidad</th>
                            <th className="p-3">Precio Base</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="p-3 text-gray-500">#{r.id}</td>
                                <td className="p-3 font-medium">{r.name}</td>
                                <td className="p-3">
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold">{r.room_type}</span>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <Users size={14} /> {r.capacity_adults}
                                        {r.capacity_children > 0 && <span className="text-xs text-gray-400"> + {r.capacity_children} niñ.</span>}
                                    </div>
                                </td>
                                <td className="p-3 font-medium">{formatCurrencyCLP(r.default_rate)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${statusColors[r.status] || "bg-gray-100"}`}>
                                        {r.status.replace("_", " ")}
                                    </span>
                                </td>
                                <td className="p-3 text-right space-x-2">
                                    <button
                                        onClick={() => openEdit(r)}
                                        disabled={isDeleting}
                                        className="text-blue-600 hover:bg-blue-50 p-1 rounded disabled:opacity-50"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(r.id)}
                                        disabled={isDeleting}
                                        className="text-red-600 hover:bg-red-50 p-1 rounded disabled:opacity-50"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-400">No se encontraron habitaciones.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <RoomFormModal
                    open={isModalOpen}
                    room={editingRoom}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    onDelete={editingRoom ? () => handleDelete(editingRoom.id) : undefined}
                    saving={isSubmitting}
                />
            )}
        </div>
    );
}
