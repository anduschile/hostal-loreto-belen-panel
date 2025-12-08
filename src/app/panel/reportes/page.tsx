import { getDetailedStats } from "@/lib/data/stats";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReportsPage(props: {
    searchParams: SearchParams;
}) {
    const searchParams = await props.searchParams;

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const from = typeof searchParams.from === "string" ? searchParams.from : firstDay;
    const to = typeof searchParams.to === "string" ? searchParams.to : today;

    const data = await getDetailedStats({ fromDate: from, toDate: to });

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Reportes Detallados</h1>
            <ReportsClient
                initialFrom={from}
                initialTo={to}
                initialData={data}
            />
        </div>
    );
}
