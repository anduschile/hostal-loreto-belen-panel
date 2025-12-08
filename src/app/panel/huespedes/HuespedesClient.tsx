"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Guest } from "@/types/hostal";
import { User, Edit, Trash2, Plus, Search, Mail, Phone, FileText } from "lucide-react";

type Props = {
  initialGuests: Guest[];
};

export default function HuespedesClient({ initialGuests }: Props) {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDoc, setFormDoc] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCountry, setFormCountry] = useState("Chile");
  const [formNotes, setFormNotes] = useState("");

  // Client-side simple filter (for small lists), otherwise Server Search should be used.
  // We'll implemented client filter for `initialGuests`, but for real robustness we might want a "Search" button that calls API.
  // For < 1000 guests, client side is instant.
  const filtered = guests.filter(g =>
    g.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (g.document_id && g.document_id.toLowerCase().includes(search.toLowerCase())) ||
    (g.email && g.email.toLowerCase().includes(search.toLowerCase()))
  );

  const openNew = () => {
    setEditingGuest(null);
    setFormName("");
    setFormDoc("");
    setFormEmail("");
    setFormPhone("");
    setFormCountry("Chile");
    setFormNotes("");
    setIsModalOpen(true);
  };

  const openEdit = (g: Guest) => {
    setEditingGuest(g);
    setFormName(g.full_name);
    setFormDoc(g.document_id || "");
    setFormEmail(g.email || "");
    setFormPhone(g.phone || "");
    setFormCountry(g.country || "Chile");
    setFormNotes(g.notes || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este huésped?")) return;
    try {
      const res = await fetch(`/api/guests?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setGuests(prev => prev.filter(g => g.id !== id));
      router.refresh();
    } catch (e) {
      alert("Error al eliminar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      full_name: formName,
      document_id: formDoc,
      email: formEmail,
      phone: formPhone,
      country: formCountry,
      notes: formNotes,
      is_active: true
    };

    try {
      let res;
      if (editingGuest) {
        res = await fetch("/api/guests", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingGuest.id, ...payload })
        });
      } else {
        res = await fetch("/api/guests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      if (editingGuest) {
        setGuests(prev => prev.map(g => g.id === json.data.id ? json.data : g));
      } else {
        setGuests(prev => [...prev, json.data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      }
      setIsModalOpen(false);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between mb-4 flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT, email..."
            className="border p-2 pl-10 rounded w-72"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> Nuevo Huésped
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600 uppercase text-xs">
              <th className="p-3">Huésped</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Contacto</th>
              <th className="p-3">Nacionalidad</th>
              <th className="p-3">Info</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(g => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                      {g.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    {g.full_name}
                  </div>
                </td>
                <td className="p-3 text-gray-600">{g.document_id || "-"}</td>
                <td className="p-3 text-sm">
                  {(g.email || g.phone) ? (
                    <div className="space-y-1">
                      {g.email && <div className="flex items-center gap-1"><Mail size={12} /> {g.email}</div>}
                      {g.phone && <div className="flex items-center gap-1"><Phone size={12} /> {g.phone}</div>}
                    </div>
                  ) : <span className="text-gray-400">-</span>}
                </td>
                <td className="p-3 text-gray-600">{g.country}</td>
                <td className="p-3">
                  {g.notes && <div title={g.notes}><FileText size={16} className="text-gray-400 cursor-help" /></div>}
                </td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => openEdit(g)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No se encontraron huéspedes.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">{editingGuest ? "Editar Huésped" : "Nuevo Huésped"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Nombre Completo *</label>
                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} className="w-full border p-2 rounded" placeholder="Ej: Juan Pérez" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Documento (RUT/DNI)</label>
                  <input type="text" value={formDoc} onChange={e => setFormDoc(e.target.value)} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">País</label>
                  <input type="text" value={formCountry} onChange={e => setFormCountry(e.target.value)} className="w-full border p-2 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Teléfono</label>
                  <input type="text" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full border p-2 rounded" />
                </div>
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
