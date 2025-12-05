// src/app/panel/huespedes/HuespedesClient.tsx
"use client";

import { useState, useMemo, ChangeEvent } from "react";
import type { Guest } from "@/types/hostal";

interface HuespedesClientProps {
  initialGuests: Guest[];
}

type GuestFormData = {
  full_name: string;
  document_id: string;
  email: string;
  phone: string;
  country: string;
  notes: string;
  is_active: boolean;
};

const GUEST_INITIAL_STATE: GuestFormData = {
  full_name: "",
  document_id: "",
  email: "",
  phone: "",
  country: "",
  notes: "",
  is_active: true,
};

export default function HuespedesClient({
  initialGuests,
}: HuespedesClientProps) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [formData, setFormData] = useState<GuestFormData>(GUEST_INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);

  const filteredGuests = useMemo(() => {
    if (!searchTerm) return guests;
    const lower = searchTerm.toLowerCase();

    return guests.filter((guest) => {
      return (
        guest.full_name.toLowerCase().includes(lower) ||
        (guest.document_id ?? "").toLowerCase().includes(lower) ||
        (guest.email ?? "").toLowerCase().includes(lower) ||
        (guest.phone ?? "").toLowerCase().includes(lower)
      );
    });
  }, [guests, searchTerm]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openModal = (guest: Guest | null = null) => {
    setError(null);

    if (guest) {
      setSelectedGuest(guest);
      setFormData({
        full_name: guest.full_name,
        document_id: guest.document_id ?? "",
        email: guest.email ?? "",
        phone: guest.phone ?? "",
        country: guest.country ?? "",
        notes: guest.notes ?? "",
        is_active: guest.is_active,
      });
    } else {
      setSelectedGuest(null);
      setFormData(GUEST_INITIAL_STATE);
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGuest(null);
    setFormData(GUEST_INITIAL_STATE);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.full_name.trim()) {
      setError("El nombre completo es obligatorio.");
      return;
    }

    const method = selectedGuest ? "PUT" : "POST";
    const url = selectedGuest
      ? `/api/huespedes/${selectedGuest.id}`
      : "/api/huespedes";

    // Convertir strings vacíos a null para campos opcionales
    const payload = {
      full_name: formData.full_name.trim(),
      document_id: formData.document_id.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      country: formData.country.trim() || null,
      notes: formData.notes.trim() || null,
      is_active: formData.is_active,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null as any);

      if (!response.ok) {
        const msg = data?.message || "Ocurrió un error al guardar.";
        throw new Error(msg);
      }

      const savedGuest = data as Guest;

      if (selectedGuest) {
        setGuests((prev) =>
          prev.map((g) => (g.id === savedGuest.id ? savedGuest : g))
        );
      } else {
        setGuests((prev) => [...prev, savedGuest]);
      }

      closeModal();
    } catch (err: any) {
      console.error("Error guardando huésped:", err);
      setError(err?.message ?? "No se pudo guardar el huésped.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este huésped?")) {
      return;
    }

    try {
      const response = await fetch(`/api/huespedes/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null as any);

      if (!response.ok) {
        const msg = data?.message || "Error al eliminar huésped.";
        throw new Error(msg);
      }

      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      console.error("Error eliminando huésped:", err);
      alert(err?.message ?? "No se pudo eliminar el huésped.");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <input
          type="text"
          placeholder="Buscar por nombre, email, documento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => openModal()}
          className="w-full md:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Añadir Huésped
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                País
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredGuests.map((guest) => (
              <tr key={guest.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {guest.full_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {guest.document_id || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {guest.email || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {guest.phone || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {guest.country || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {guest.is_active ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Activo
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                  <button
                    onClick={() => openModal(guest)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(guest.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {filteredGuests.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-center text-gray-400 text-sm"
                >
                  No hay huéspedes registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-xl font-semibold mb-4">
              {selectedGuest ? "Editar Huésped" : "Nuevo Huésped"}
            </h3>

            {error && (
              <p className="text-red-500 bg-red-100 p-2 rounded-md mb-4 text-sm">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Documento (RUT, DNI, Pasaporte)
                  </label>
                  <input
                    type="text"
                    name="document_id"
                    value={formData.document_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    País
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notas Internas
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="is_active"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Huésped activo
                </label>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
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
