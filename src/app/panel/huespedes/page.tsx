// src/app/panel/huespedes/page.tsx
import { getGuests } from "@/lib/data/guests";
import HuespedesClient from "./HuespedesClient";

export const dynamic = "force-dynamic";

export default async function HuespedesPage() {
  const initialGuests = await getGuests();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        Gestión de Huéspedes
      </h1>
      <HuespedesClient initialGuests={initialGuests} />
    </div>
  );
}
