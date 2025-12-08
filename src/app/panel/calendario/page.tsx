import { getCalendarData } from "@/lib/data/calendar";
import CalendarWrapper from "./CalendarWrapper";
import { startOfWeek, endOfWeek, format } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendario de Reservas",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

import { getRooms } from "@/lib/data/rooms";
import { getGuests } from "@/lib/data/guests";

export default async function CalendarPage(props: {
  searchParams: SearchParams;
}) {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const end = endOfWeek(today, { weekStartsOn: 1 });

  const fromStr = format(start, "yyyy-MM-dd");
  const toStr = format(end, "yyyy-MM-dd");

  const [data, detailedRooms, guests] = await Promise.all([
    getCalendarData(fromStr, toStr),
    getRooms(),
    getGuests()
  ]);

  return (
    <div className="p-4 h-full bg-gray-50 flex flex-col">
      <CalendarWrapper
        initialData={data}
        masterRooms={detailedRooms}
        masterGuests={guests}
      />
    </div>
  );
}
