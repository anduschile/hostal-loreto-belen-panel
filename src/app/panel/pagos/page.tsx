import { getPayments } from "@/lib/data/payments";
import { getReservations } from "@/lib/data/reservations";
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
  const allReservations = await getReservations(); // Fetch all for selector (can optimize later if needed)

  // Map to simple structure for select
  const reservationOptions = allReservations.map((r: any) => ({
    id: r.id,
    label: `Res #${r.id} - ${r.code || "S/C"} - ${r.hostal_guests?.full_name || "Hués. Desc."} - ${r.hostal_rooms?.name || "Hab. Desc."} (${r.check_in} -> ${r.check_out})`
  }));

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Pagos</h1>
      <PagosClient
        initialPayments={payments}
        initialFrom={fromDate}
        initialTo={toDate}
        reservationOptions={reservationOptions}
      />
    </div>
  );
}
