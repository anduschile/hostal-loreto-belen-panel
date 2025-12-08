"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HostalRoom } from "@/types/hostal";
import { formatCurrencyCLP } from "@/lib/formatters";
import { Users, Edit, Trash2, Plus } from "lucide-react";

type Props = {
    initialRooms: HostalRoom[];
};

export default function RoomsClient({ initialRooms }: Props) {
    const router = useRouter();
    const [rooms, setRooms] = useState<HostalRoom[]>(initialRooms);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<HostalRoom | null>(null);

    // Form State
    const [formName, setFormName] = useState("");
    const [formCode, setFormCode] = useState("");
    const [formType, setFormType] = useState("Matrimonial");
    const [formCapacity, setFormCapacity] = useState("2");
    const [formRate, setFormRate] = useState("");
    const [formStatus, setFormStatus] = useState("disponible");
    const [formNotes, setFormNotes] = useState("");

    const filtered = rooms.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.room_type.toLowerCase().includes(search.toLowerCase())
    );

    const openNew = () => {
        setEditingRoom(null);
        setFormName("");
        setFormCode("");
        setFormType("Matrimonial");
        setFormCapacity("2");
        setFormRate("");
        setFormStatus("disponible");
        setFormNotes("");
        setIsModalOpen(true);
    };

    const openEdit = (room: HostalRoom) => {
        setEditingRoom(room);
        setFormName(room.name);
        setFormCode(room.code);
        setFormType(room.room_type);
        setFormCapacity(String(room.capacity_adults));
        setFormRate(room.default_rate ? String(room.default_rate) : "");
        setFormStatus(room.status);
        setFormNotes(room.notes || "");
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar esta habitación?")) return;
        try {
            const res = await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            setRooms(prev => prev.filter(r => r.id !== id));
            router.refresh();
        } catch (e) {
            alert("Error al eliminar");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: formName,
            code: formCode || formName.slice(0, 3).toUpperCase(),
            room_type: formType,
            capacity_adults: Number(formCapacity),
            capacity_children: 0,
            default_rate: formRate ? Number(formRate) : null,
            status: formStatus,
            notes: formNotes,
            currency: "CLP"
        };

        try {
            let res;
            if (editingRoom) {
                res = await fetch("/api/rooms", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingRoom.id, ...payload })
                });
            } else {
                res = await fetch("/api/rooms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            }

            const json = await res.json();
            if (!json.ok) throw new Error(json.error);

            if (editingRoom) {
                setRooms(prev => prev.map(r => r.id === json.data.id ? json.data : r));
            } else {
                setRooms(prev => [...prev, json.data].sort((a, b) => a.id - b.id));
            }
            setIsModalOpen(false);
            router.refresh();
        } catch (e: any) {
            alert(e.message);
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
                                    </div>
                                </td>
                                <td className="p-3 font-medium">{formatCurrencyCLP(r.default_rate)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${statusColors[r.status] || "bg-gray-100"}`}>
                                        {r.status.replace("_", " ")}
                                    </span>
                                </td>
                                <td className="p-3 text-right space-x-2">
                                    <button onClick={() => openEdit(r)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{editingRoom ? "Editar Habitación" : "Nueva Habitación"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Nombre *</label>
                                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} className="w-full border p-2 rounded" placeholder="Ej: Matrimonial 101" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Código</label>
                                    <input type="text" value={formCode} onChange={e => setFormCode(e.target.value)} className="w-full border p-2 rounded" placeholder="Ej: MAT101" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Tipo *</label>
                                    <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full border p-2 rounded">
                                        <option>Matrimonial</option>
                                        <option>Doble</option>
                                        <option>Triple</option>
                                        <option>Cuadruple</option>
                                        <option>Departamento</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Capacidad *</label>
                                    <input type="number" min="1" required value={formCapacity} onChange={e => setFormCapacity(e.target.value)} className="w-full border p-2 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Precio Base</label>
                                    <input type="number" min="0" value={formRate} onChange={e => setFormRate(e.target.value)} className="w-full border p-2 rounded" placeholder="$" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Estado *</label>
                                <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="w-full border p-2 rounded">
                                    <option value="disponible">Disponible</option>
                                    <option value="ocupada">Ocupada</option>
                                    <option value="mantenimiento">Mantenimiento</option>
                                    <option value="limpieza">Limpieza</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Notas</label>
                                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full border p-2 rounded h-20"></textarea>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
