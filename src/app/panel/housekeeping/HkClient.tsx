// src/app/panel/housekeeping/HkClient.tsx
"use client";

import { useEffect, useState } from "react";
import type { HousekeepingStatus } from "@/types/hostal";
import type { HousekeepingWithRoom } from "@/lib/data/housekeeping";

interface HkClientProps {
  initialDate: string; // YYYY-MM-DD
  initialData: HousekeepingWithRoom[];
}

type Row = HousekeepingWithRoom;

const STATUS_OPTIONS: { value: HousekeepingStatus; label: string }[] = [
  { value: "sucia", label: "Sucia" },
  { value: "en_limpieza", label: "En limpieza" },
  { value: "lista", label: "Lista" },
  { value: "mantenimiento", label: "Mantenimiento" },
];

export default function HkClient({ initialDate, initialData }: HkClientProps) {
  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState<Row[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar data al cambiar fecha
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/housekeeping?date=${date}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Error al cargar housekeeping");
        }
        setRows(data.items as Row[]);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "No se pudo cargar housekeeping");
      } finally {
        setLoading(false);
      }
    };

    // No recargar en el primer render si date = initialDate & rows = initialData
    if (date !== initialDate) {
      fetchData();
    }
  }, [date, initialDate]);

  const handleChangeStatus = (roomId: number, status: HousekeepingStatus) => {
    setRows((prev) =>
      prev.map((row) =>
        row.room_id === roomId ? { ...row, status } : row
      )
    );
  };

  const handleChangeNotes = (roomId: number, notes: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.room_id === roomId ? { ...row, notes } : row
      )
    );
  };

  const handleSaveRow = async (row: Row) => {
    if (!row.status) {
      alert("Debes seleccionar un estado antes de guardar.");
      return;
    }

    setSavingId(row.room_id);
    setError(null);
    try {
      const res = await fetch("/api/housekeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: row.room_id,
          date,
          status: row.status,
          notes: row.notes ?? null,
        }),
      });

      const data = await res.json().catch(() => null as any);

      if (!res.ok) {
        throw new Error(data?.message || "Error al guardar estado");
      }

      // Actualizar housekeeping_id si viene en la respuesta
      const returned = data;
      setRows((prev) =>
        prev.map((r) =>
          r.room_id === row.room_id
            ? { ...r, housekeeping_id: returned.id ?? r.housekeeping_id }
            : r
        )
      );
    } catch (err: any) {
      console.error("Error saving housekeeping row:", err);
      setError(err?.message ?? "No se pudo guardar el estado.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            Fecha:
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {loading && (
          <span className="text-sm text-gray-500">
            Cargando estados...
          </span>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Habitación
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notas
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.room_id}>
                <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">
                  {row.room_code} – {row.room_name}
                </td>
                <td className="px-4 py-2">
                  <select
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={row.status ?? ""}
                    onChange={(e) =>
                      handleChangeStatus(
                        row.room_id,
                        e.target.value as HousekeepingStatus
                      )
                    }
                  >
                    <option value="">Seleccionar...</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={row.notes ?? ""}
                    onChange={(e) =>
                      handleChangeNotes(row.room_id, e.target.value)
                    }
                    placeholder="Notas opcionales..."
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => handleSaveRow(row)}
                    disabled={savingId === row.room_id}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingId === row.room_id ? "Guardando..." : "Guardar"}
                  </button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-4 text-center text-gray-400 text-sm"
                >
                  No hay habitaciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
