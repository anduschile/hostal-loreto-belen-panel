"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { HostalRoom } from "@/types/hostal";

type Props = {
    open: boolean;
    room: HostalRoom | null;
    onClose: () => void;
    onSave: (payload: {
        id?: number;
        name: string;
        code: string;
        room_type: string;
        capacity_adults: number;
        capacity_children: number;
        annex: string | null;
        notes: string | null;
        status: string;
    }) => void | Promise<void>;
    saving?: boolean;
};

export default function RoomFormModal({
    open,
    room,
    onClose,
    onSave,
    saving,
}: Props) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [roomType, setRoomType] = useState("MATRIMONIAL");
    const [capacityAdults, setCapacityAdults] = useState(2);
    const [capacityChildren, setCapacityChildren] = useState(0);
    const [annex, setAnnex] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [status, setStatus] = useState("disponible");

    // Cargar datos cuando se abre con una habitación
    useEffect(() => {
        if (room && open) {
            setName(room.name || "");
            setCode(room.code || "");
            setRoomType(
                (room.room_type || "").toUpperCase() || "MATRIMONIAL"
            );
            setCapacityAdults(room.capacity_adults ?? 2);
            setCapacityChildren(room.capacity_children ?? 0);
            setAnnex(room.annex || "");
            setNotes(room.notes || "");
            setStatus(room.status || "disponible");
        }

        if (!room && open) {
            // Nueva habitación → valores por defecto
            setName("");
            setCode("");
            setRoomType("MATRIMONIAL");
            setCapacityAdults(2);
            setCapacityChildren(0);
            setAnnex("");
            setNotes("");
            setStatus("disponible");
        }
    }, [room, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert("El nombre de la habitación es obligatorio.");
            return;
        }

        if (!code.trim()) {
            alert("El código de la habitación es obligatorio.");
            return;
        }

        await onSave({
            id: room?.id,
            name: name.trim(),
            code: code.trim(),
            room_type: roomType.toUpperCase(),
            capacity_adults: Number(capacityAdults) || 0,
            capacity_children: Number(capacityChildren) || 0,
            annex: annex.trim() || null,
            notes: notes.trim() || null,
            status,
        });
    };

    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose}>
            <h2 className="text-lg font-bold mb-4">
                {room ? "Editar habitación" : "Nueva habitación"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre + Código */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Nombre de la habitación *
                        </label>
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Código *
                        </label>
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                </div>

                {/* Tipo + Estado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Tipo
                        </label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={roomType}
                            onChange={(e) => setRoomType(e.target.value)}
                        >
                            <option value="MATRIMONIAL">Matrimonial</option>
                            <option value="DOBLE">Doble</option>
                            <option value="TRIPLE">Triple</option>
                            <option value="CUADRUPLE">Cuádruple</option>
                            <option value="FAMILIAR">Familiar</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Estado
                        </label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="disponible">Disponible</option>
                            <option value="ocupada">Ocupada</option>
                            <option value="limpieza">Limpieza</option>
                            <option value="mantenimiento">Mantenimiento</option>
                            <option value="fuera_servicio">Fuera de servicio</option>
                            <option value="archivada">Archivada</option>
                        </select>
                    </div>
                </div>

                {/* Capacidades */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Capacidad adultos
                        </label>
                        <input
                            type="number"
                            min={0}
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={capacityAdults}
                            onChange={(e) =>
                                setCapacityAdults(parseInt(e.target.value || "0", 10))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Capacidad niños
                        </label>
                        <input
                            type="number"
                            min={0}
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={capacityChildren}
                            onChange={(e) =>
                                setCapacityChildren(parseInt(e.target.value || "0", 10))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Anexo
                        </label>
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={annex}
                            onChange={(e) => setAnnex(e.target.value)}
                        />
                    </div>
                </div>

                {/* Notas */}
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Notas
                    </label>
                    <textarea
                        className="w-full border rounded px-3 py-2 text-sm min-h-[70px]"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-2 rounded-md border text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        disabled={!!saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                        disabled={!!saving}
                    >
                        {saving ? "Guardando..." : room ? "Guardar cambios" : "Crear habitación"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
