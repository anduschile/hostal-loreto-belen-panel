import { getReservations, getReservationByCode } from "@/lib/data/reservations";
import { getRooms } from "@/lib/data/rooms";
import { getGuests } from "@/lib/data/guests";
import { isIsoDay } from "@/lib/reservations/range";
import { parseCodigoParam, rangeForDeepLink } from "@/lib/reservations/deeplink";
import ReservasList from "./ReservasList";

export const dynamic = "force-dynamic";

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type SearchParams = Promise<{ from?: string | string[]; to?: string | string[]; codigo?: string | string[] }>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ReservasPage({ searchParams }: { searchParams: SearchParams }) {
  const today = getTodayISO();

  // Rango activo: el de la URL (?from=&to=) o, por defecto, hoy..hoy. Se filtra en el servidor.
  const sp = await searchParams;
  let from = first(sp.from);
  let to = first(sp.to);
  if (!isIsoDay(from) || !isIsoDay(to)) {
    from = today;
    to = today;
  }
  if (from > to) [from, to] = [to, from];

  // Enlace directo desde el correo (?codigo=): si es una solicitud web pendiente, se muestra su rango y se resalta.
  const codigo = parseCodigoParam(sp.codigo);
  const target = codigo ? await getReservationByCode(codigo) : null;
  const deep = rangeForDeepLink(target, first(sp.from), first(sp.to), { from, to });
  from = deep.from;
  to = deep.to;

  const allReservations = await getReservations({ range: { from, to } }).catch((err) => {
    console.error("[ReservasPage] Error al cargar reservas:", err);
    return [];
  });

  const rooms = await getRooms();
  const guests = await getGuests();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">Reservas</h1>

      <ReservasList
        initialReservations={allReservations ?? []}
        today={today}
        from={from}
        to={to}
        rooms={rooms ?? []}
        guests={guests ?? []}
        highlightCode={deep.highlightCode}
      />
    </div>
  );
}
