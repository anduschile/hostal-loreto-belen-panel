"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Tipo local para UI, basado en la tabla
type User = {
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at?: string;
};

export default function UsuariosClient() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form states
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("recepcion");
    const [isActive, setIsActive] = useState(true);

    // Cargar usuarios
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const openNewUser = () => {
        setEditingUser(null);
        setFullName("");
        setEmail("");
        setRole("recepcion");
        setIsActive(true);
        setIsModalOpen(true);
    };

    const openEditUser = (user: User) => {
        setEditingUser(user);
        setFullName(user.full_name);
        setEmail(user.email);
        setRole(user.role);
        setIsActive(user.is_active);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar usuario? Esta acción no se puede deshacer.")) return;
        try {
            const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== id));
            } else {
                alert("Error al eliminar");
            }
        } catch (e) {
            alert("Error de red");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            full_name: fullName,
            email,
            role,
            is_active: isActive
        };

        try {
            if (editingUser) {
                // Update
                const res = await fetch("/api/users", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingUser.id, ...payload }),
                });
                if (!res.ok) throw new Error("Error al actualizar");
                const updated = await res.json();
                setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
            } else {
                // Create
                const res = await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error("Error al crear");
                const created = await res.json();
                setUsers(prev => [...prev, created]);
            }
            setIsModalOpen(false);
        } catch (e) {
            alert("Error al guardar usuario");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold">Listado de Usuarios</h2>
                <button
                    onClick={openNewUser}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    + Nuevo Usuario
                </button>
            </div>

            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Rol</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={5} className="p-4 text-center">Cargando...</td></tr>}
                        {!loading && users.map(user => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{user.full_name}</td>
                                <td className="p-3">{user.email}</td>
                                <td className="p-3 capitalize">{user.role}</td>
                                <td className="p-3">
                                    {user.is_active ?
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Activo</span> :
                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Inactivo</span>
                                    }
                                </td>
                                <td className="p-3 space-x-2">
                                    <button
                                        onClick={() => openEditUser(user)}
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Borrar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && users.length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center">No hay usuarios registrados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">{editingUser ? "Editar Usuario" : "Crear Usuario"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Rol</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full border p-2 rounded"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="recepcion">Recepción</option>
                                    <option value="aseo">Aseo</option>
                                    <option value="mantencion">Mantención</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={e => setIsActive(e.target.checked)}
                                    id="activeCheck"
                                />
                                <label htmlFor="activeCheck" className="text-sm">Usuario Activo</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
