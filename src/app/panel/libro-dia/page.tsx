import { getDaybook } from "@/lib/data/daybook";
import DaybookClient from "./DaybookClient";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

import { getRooms } from "@/lib/data/rooms";
import { getGuests } from "@/lib/data/guests";

export default async function DaybookPage(props: {
    searchParams: SearchParams;
}) {
    const searchParams = await props.searchParams;

    // Fecha por defecto: hoy
    const today = new Date().toISOString().split('T')[0];
    const date = typeof searchParams.date === "string" ? searchParams.date : today;

    const [entries, rooms, guests] = await Promise.all([
        getDaybook(date),
        getRooms(),
        getGuests()
    ]);

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Libro del Día</h1>
            <DaybookClient
                initialDate={date}
                initialEntries={entries}
                rooms={rooms}
                guests={guests}
            />
        </div>
    );
}
