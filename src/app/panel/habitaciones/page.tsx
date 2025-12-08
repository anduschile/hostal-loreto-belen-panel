import { getRooms } from "@/lib/data/rooms";
import RoomsGrid from "./RoomsGrid";

export const dynamic = "force-dynamic";

export default async function HabitacionesPage() {
  const rooms = await getRooms();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Habitaciones</h1>
      {/* Pasamos solo datos al componente cliente */}
      <RoomsGrid initialRooms={rooms} />
    </div>
  );
}
