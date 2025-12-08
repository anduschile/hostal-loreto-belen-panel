import { getReservations } from "@/lib/data/reservations";
import ReservasList from "./ReservasList";

export const dynamic = "force-dynamic";

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function ReservasPage() {
  const today = getTodayISO();

  // Traemos TODAS las reservas y el filtro se hace en el cliente.
  const allReservations = await getReservations().catch((err) => {
    console.error("[ReservasPage] Error al cargar reservas:", err);
    return [];
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">Reservas</h1>

      <ReservasList
        initialReservations={allReservations ?? []}
        today={today}
      />
    </div>
  );
}
