// src/app/(panel)/habitaciones/page.tsx

import type { Metadata } from "next";
import { supabase } from "@/lib/supabaseClient";

export const metadata: Metadata = {
  title: "Habitaciones | Panel Hostal",
};

type Habitacion = {
  id: string;
  code: string | null;
  name: string | null;
  room_type: string | null;
  capacity: number | null;
  annex: string | null;
  floor: number | null;
  base_rate: number | null;
  status: string | null;
};

async function getRooms(): Promise<Habitacion[]> {
  const { data, error } = await supabase
    .from("hostal_rooms")
    .select("*")
    .order("code", { ascending: true });

  if (error) {
    console.error("Error cargando habitaciones:", error.message);
    return [];
  }

  return (data as Habitacion[]) ?? [];
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case "available":
      return "Disponible";
    case "occupied":
      return "Ocupada";
    case "maintenance":
      return "Mantenimiento";
    case "out_of_service":
      return "Fuera de servicio";
    default:
      return "Sin estado";
  }
}

function getStatusClass(status: string | null): string {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-700 border border-green-300";
    case "occupied":
      return "bg-red-100 text-red-700 border border-red-300";
    case "maintenance":
      return "bg-yellow-100 text-yellow-700 border border-yellow-300";
    case "out_of_service":
      return "bg-gray-200 text-gray-700 border border-gray-300";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-300";
  }
}

export default async function HabitacionesPage() {
  const rooms = await getRooms();

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Título principal */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          Habitaciones
        </h1>
        <p className="text-sm text-slate-500">
          Gestión básica de habitaciones del hostal.
        </p>
      </div>

      {/* Resumen simple */}
      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span className="font-medium">
          Habitaciones cargadas: {rooms.length}
        </span>
      </div>

      {/* Si no hay habitaciones, mensaje claro */}
      {rooms.length === 0 && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se encontraron habitaciones en la base de datos
          {" "}
          <span className="font-semibold">(tabla hostal_rooms)</span>.
          Revisa Supabase para agregar algunas.
        </div>
      )}

      {/* Grid de tarjetas */}
      {rooms.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <header className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Hab. {room.code ?? "—"}{" "}
                    {room.name ? `– ${room.name}` : ""}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tipo: {room.room_type ?? "Sin tipo"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(
                    room.status
                  )}`}
                >
                  {getStatusLabel(room.status)}
                </span>
              </header>

              <dl className="mt-2 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Capacidad</dt>
                  <dd>
                    {room.capacity != null
                      ? `${room.capacity} huésped(es)`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Anexo</dt>
                  <dd>{room.annex ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Piso</dt>
                  <dd>{room.floor ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tarifa base</dt>
                  <dd>
                    {room.base_rate != null
                      ? `CLP ${room.base_rate.toLocaleString("es-CL")}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
