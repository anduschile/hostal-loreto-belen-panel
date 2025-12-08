// src/app/panel/housekeeping/page.tsx
import { getHousekeepingWithRoomsByDate } from "@/lib/data/housekeeping";
import HkClient from "./HkClient";

export const dynamic = "force-dynamic";

function getTodayISODate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default async function HousekeepingPage() {
  const today = getTodayISODate();
  const items = await getHousekeepingWithRoomsByDate(today);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        Housekeeping / Limpieza
      </h1>
      <HkClient initialDate={today} initialData={items} />
    </div>
  );
}
