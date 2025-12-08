"use client";

import { useState } from "react";
import { HostalRoom } from "@/types/hostal";

type Props = {
    room: HostalRoom;
    onEdit: (room: HostalRoom) => void;
    onUpdateStatus: (id: number, status: string) => void;
};

export default function RoomCard({ room, onEdit, onUpdateStatus }: Props) {
    const [localStatus, setLocalStatus] = useState(room.status);

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setLocalStatus(newStatus as any);
        onUpdateStatus(room.id, newStatus);
    };

    return (
        <div className="border rounded-xl p-5 bg-white shadow hover:shadow-lg transition-all flex flex-col gap-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-gray-800">{room.name}</h2>
                <p className="text-sm text-gray-500">{room.room_type}</p>
            </div>

            {/* Info */}
            <div className="text-sm text-gray-700 space-y-1">
                <p>
                    <b>Código:</b> {room.code}
                </p>
                <p>
                    <b>Capacidad:</b> {room.capacity_adults} adultos
                </p>
                {room.capacity_children > 0 && (
                    <p>
                        <b>Niños:</b> {room.capacity_children}
                    </p>
                )}
                {room.annex && (
                    <p>
                        <b>Anexo:</b> {room.annex}
                    </p>
                )}
            </div>

            {/* Estado */}
            <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-600 mb-1">Estado</label>
                <select
                    value={localStatus}
                    onChange={handleStatusChange}
                    className="border rounded px-3 py-2 text-sm"
                >
                    <option value="disponible">Disponible</option>
                    <option value="ocupada">Ocupada</option>
                    <option value="limpieza">Limpieza</option>
                    <option value="fuera_servicio">Fuera de servicio</option>
                </select>
            </div>

            {/* Notas */}
            {room.notes && (
                <div className="text-xs text-gray-500 border-t pt-2 italic">
                    {room.notes}
                </div>
            )}

            {/* Acciones */}
            <div className="flex justify-between pt-2 border-t">
                <button
                    onClick={() => onEdit(room)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                >
                    Editar
                </button>

                <button
                    onClick={() => onUpdateStatus(room.id, "archivada")}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs hover:bg-gray-300"
                >
                    Archivar
                </button>
            </div>
        </div>
    );
}
