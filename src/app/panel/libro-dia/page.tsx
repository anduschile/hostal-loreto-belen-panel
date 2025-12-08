import { getDaybook } from "@/lib/data/daybook";
import DaybookClient from "./DaybookClient";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Libro del Día",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function DaybookPage(props: {
    searchParams: SearchParams;
}) {
    const searchParams = await props.searchParams;

    // Default date: Today in Chile (UTC-4/-3)
    // Using en-CA locale typically results in YYYY-MM-DD
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

    const dateParam = typeof searchParams.date === "string" ? searchParams.date : today;

    const entries = await getDaybook(dateParam);

    return (
        <div className="p-6">
            <DaybookClient entries={entries} initialDate={dateParam} />
        </div>
    );
}
