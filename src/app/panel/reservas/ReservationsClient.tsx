"use client";

import { useState } from "react";
import type { Reservation, ReservationStatus } from "@/lib/data/reservations";

type Props = {
  initialReservations: Reservation[];
};

type NewReservationForm = {
  room_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
};

const statusLabels: Record<ReservationStatus, string> = {
  hold: "En espera",
  confirmada: "Confirmada",
  checkin: "Check-in",
  checkout: "Check-out",
  cancelada: "Cancelada",
};

export default function ReservationsClient({ initialReservations }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<NewReservationForm>({
    room_id: "",
    guest_name: "",
    check_in: "",
    check_out: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof NewReservationForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setError(null);

    if (!form.room_id || !form.guest_name || !form.check_in || !form.check_out) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: Number(form.room_id),
          guest_name: form.guest_name,
          check_in: form.check_in,
          check_out: form.check_out,
          status: "hold",
          // adults, children, source y code se manejan con defaults en el backend
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al crear la reserva");
      }

      const newReservation = (await res.json()) as Reservation;
      setReservations((prev) => [...prev, newReservation]);

      // reset form
      setForm({
        room_id: "",
        guest_name: "",
        check_in: "",
        check_out: "",
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta reserva?")) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reservas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al eliminar");
      }

      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: ReservationStatus) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reservas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al actualizar estado");
      }

      const updated = (await res.json()) as Reservation;
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulario simple de creación */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Nueva reserva rápida</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Habitación (ID) *
            </label>
            <input
              type="number"
              className="w-full rounded border px-2 py-1 text-sm"
              value={form.room_id}
              onChange={(e) => handleChange("room_id", e.target.value)}
              placeholder="Ej: 1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre huésped *
            </label>
            <input
              type="text"
              className="w-full rounded border px-2 py-1 text-sm"
              value={form.guest_name}
              onChange={(e) => handleChange("guest_name", e.target.value)}
              placeholder="Ej: Pat W."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Check-in *
            </label>
            <input
              type="date"
              className="w-full rounded border px-2 py-1 text-sm"
              value={form.check_in}
              onChange={(e) => handleChange("check_in", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Check-out *
            </label>
            <input
              type="date"
              className="w-full rounded border px-2 py-1 text-sm"
              value={form.check_out}
              onChange={(e) => handleChange("check_out", e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-2">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Crear reserva"}
        </button>
      </div>

      {/* Tabla simple de reservas */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Listado de reservas</h2>
          <span className="text-xs text-gray-500">
            Total: {reservations.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                <th className="border px-2 py-1 text-left">Código</th>
                <th className="border px-2 py-1 text-left">Hab.</th>
                <th className="border px-2 py-1 text-left">Huésped</th>
                <th className="border px-2 py-1 text-left">Check-in</th>
                <th className="border px-2 py-1 text-left">Check-out</th>
                <th className="border px-2 py-1 text-left">Estado</th>
                <th className="border px-2 py-1 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 && (
                <tr>
                  <td
                    className="border px-2 py-3 text-center text-gray-400"
                    colSpan={7}
                  >
                    No hay reservas registradas todavía.
                  </td>
                </tr>
              )}

              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{r.code}</td>
                  <td className="border px-2 py-1">{r.room_id}</td>
                  <td className="border px-2 py-1">{r.guest_name}</td>
                  <td className="border px-2 py-1">
                    {r.check_in}
                  </td>
                  <td className="border px-2 py-1">
                    {r.check_out}
                  </td>
                  <td className="border px-2 py-1">
                    <select
                      className="w-full rounded border px-1 py-0.5 text-xs"
                      value={r.status}
                      onChange={(e) =>
                        handleStatusChange(
                          r.id,
                          e.target.value as ReservationStatus
                        )
                      }
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border px-2 py-1">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <p className="mt-2 text-xs text-gray-400">
            Procesando cambios...
          </p>
        )}
      </div>
    </div>
  );
}
