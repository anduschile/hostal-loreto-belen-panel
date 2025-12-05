// src/app/panel/reservas/page.tsx
import { fetchReservations, type Reservation } from "@/lib/data/reservations";
import ReservationsClient from "./ReservationsClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const reservations: Reservation[] = await fetchReservations();

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Reservas</h1>
        <p className="text-sm text-gray-500">
          Gestión básica de reservas (MVP). Luego agregamos calendario y vistas avanzadas.
        </p>
      </div>

      <ReservationsClient initialReservations={reservations} />
    </div>
  );
}
