"use client";

import { useState, useEffect } from "react";
import { Guest, Company } from "@/types/hostal";

interface Props {
  open: boolean;
  onClose: () => void;
  serviceId: number;
  onSuccess: () => void;
}

type Step = "search" | "create" | "company";

interface SearchResult {
  id: number;
  full_name: string;
  phone?: string | null;
}

export default function AddManualGuestModal({
  open,
  onClose,
  serviceId,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<SearchResult | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form for new guest
  const [newGuestForm, setNewGuestForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (open) {
      fetchCompanies();
      setStep("search");
      setSearchQuery("");
      setSelectedGuest(null);
      setSelectedCompanyId(null);
      setError("");
      setNewGuestForm({ full_name: "", phone: "", email: "" });
    }
  }, [open]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data || []);
    } catch (err: any) {
      console.error("Error fetching companies:", err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setError("");

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/guests/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search guests");
      const { data } = await res.json();
      setSearchResults(data || []);
    } catch (err: any) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExistingGuest = (guest: SearchResult) => {
    setSelectedGuest(guest);
    setSearchQuery("");
    setSearchResults([]);
    setStep("company");
  };

  const handleCreateNewGuest = () => {
    setStep("create");
  };

  const handleGoBackToSearch = () => {
    setStep("search");
    setNewGuestForm({ full_name: "", phone: "", email: "" });
    setError("");
  };

  const validateNewGuest = () => {
    if (!newGuestForm.full_name.trim()) {
      setError("El nombre completo es requerido");
      return false;
    }
    if (!newGuestForm.phone.trim()) {
      setError("El teléfono/WhatsApp es requerido");
      return false;
    }
    return true;
  };

  const handleCreateAndSelectGuest = async () => {
    if (!validateNewGuest()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newGuestForm.full_name.trim(),
          phone: newGuestForm.phone.trim(),
          email: newGuestForm.email.trim() || null,
          is_active: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create guest");
      }

      const { data: guest } = await res.json();
      setSelectedGuest({
        id: guest.id,
        full_name: guest.full_name,
        phone: guest.phone,
      });
      setStep("company");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedGuest || selectedCompanyId === undefined) {
      setError("Debe seleccionar un huésped y una empresa");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/meal-services/${serviceId}/consumption/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_id: selectedGuest.id,
          company_id: selectedCompanyId === -1 ? null : selectedCompanyId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add guest");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Agregar Huésped Manual</h2>

        {error && (
          <div className="p-3 mb-4 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {step === "search" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar huésped existente
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Nombre, documento o email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((guest) => (
                  <button
                    key={guest.id}
                    onClick={() => handleSelectExistingGuest(guest)}
                    className="w-full p-3 text-left border border-gray-200 rounded hover:bg-blue-50 transition"
                  >
                    <div className="font-medium">{guest.full_name}</div>
                    {guest.phone && (
                      <div className="text-xs text-gray-500">{guest.phone}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !loading && (
              <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                No se encontraron huéspedes. Puedes crear uno nuevo.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewGuest}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-medium"
              >
                + Crear Nuevo Huésped
              </button>
            </div>
          </div>
        )}

        {step === "create" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={newGuestForm.full_name}
                onChange={(e) =>
                  setNewGuestForm({ ...newGuestForm, full_name: e.target.value })
                }
                placeholder="Ej: Juan Pérez"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp / Teléfono *
              </label>
              <input
                type="tel"
                value={newGuestForm.phone}
                onChange={(e) =>
                  setNewGuestForm({ ...newGuestForm, phone: e.target.value })
                }
                placeholder="Ej: +56912345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (opcional)
              </label>
              <input
                type="email"
                value={newGuestForm.email}
                onChange={(e) =>
                  setNewGuestForm({ ...newGuestForm, email: e.target.value })
                }
                placeholder="Ej: juan@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  handleGoBackToSearch();
                  setError("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAndSelectGuest}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {submitting ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        )}

        {step === "company" && selectedGuest && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Huésped seleccionado:
              </label>
              <div className="mt-2 p-3 bg-blue-50 rounded">
                <div className="font-medium">{selectedGuest.full_name}</div>
                {selectedGuest.phone && (
                  <div className="text-xs text-gray-600">{selectedGuest.phone}</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresa *
              </label>
              <select
                value={selectedCompanyId ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCompanyId(value === "" ? null : parseInt(value, 10));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar empresa...</option>
                <option value="-1">Particular (sin empresa)</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedCompanyId === null}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
              >
                {submitting ? "Agregando..." : "Agregar"}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
