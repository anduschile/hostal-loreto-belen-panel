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
  // Fetch reservations within the selected date range (or all if no range, though getting all might be heavy eventually)
  // User requested filtering by the date range selected in UI.
  const allReservations = await getReservations({ fromDate, toDate });

  // Map to simple structure for select
  const reservationOptions = allReservations.map((r: any) => {
    // Format dates: "13-14 dic"
    const start = new Date(r.check_in);
    const end = new Date(r.check_out);
    const startStr = start.toLocaleDateString('es-CL', { day: 'numeric' });
    const endStr = end.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    const year = start.getFullYear() !== new Date().getFullYear() ? ` ${start.getFullYear()}` : '';

    const dateRange = `${startStr}-${endStr}${year}`;

    // Company info
    const companyInfo = r.billing_type === 'empresa'
      ? (r.company_name_snapshot || r.hostal_companies?.name || 'Empresa')
      : 'Particular';

    return {
      id: r.id,
      label: `#${r.id} – ${r.hostal_guests?.full_name || "Huésped"} – ${r.hostal_rooms?.name || "Hab"} – ${dateRange} – ${companyInfo}`
    };
  });

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
