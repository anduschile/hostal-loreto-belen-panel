import { getGuests } from "@/lib/data/guests";
import HuespedesClient from "./HuespedesClient";

export const dynamic = "force-dynamic";

export default async function HuespedesPage() {
  const guests = await getGuests();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Directorio de Huéspedes</h1>
      </div>
      <HuespedesClient initialGuests={guests} />
    </div>
  );
}
