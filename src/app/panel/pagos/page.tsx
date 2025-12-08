import { getPayments } from "@/lib/data/payments";
import PagosClient from "./PagosClient";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function PagosPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;

  const fromDate = typeof searchParams.from === "string" ? searchParams.from : undefined;
  const toDate = typeof searchParams.to === "string" ? searchParams.to : undefined;

  const payments = await getPayments({ fromDate, toDate });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Pagos</h1>
      <PagosClient
        initialPayments={payments}
        initialFrom={fromDate}
        initialTo={toDate}
      />
    </div>
  );
}
