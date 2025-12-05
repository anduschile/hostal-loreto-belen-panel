// src/app/panel/calendario/page.tsx
import { fetchReservations } from "@/lib/data/reservations";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const reservations = await fetchReservations();

  const today = new Date();
  const initialYear = today.getFullYear();
  const initialMonth = today.getMonth() + 1; // 1-12

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Calendario de Reservas</h1>
        <p className="text-sm text-gray-500">
          Vista mensual por habitación. Versión básica para visualizar ocupación;
          luego podemos refinar colores, tooltips, filtros, etc.
        </p>
      </div>

      <CalendarClient
        reservations={reservations}
        initialYear={initialYear}
        initialMonth={initialMonth}
      />
    </div>
  );
}
