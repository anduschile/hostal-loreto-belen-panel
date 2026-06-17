import { NextResponse } from "next/server";
import { getMealConsumptionByService, createBatchMealConsumption } from "@/lib/data/meal-consumption";
import { getReservations } from "@/lib/data/reservations";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id, 10);

    const data = await getMealConsumptionByService(serviceId);

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id, 10);
    const body = await req.json();

    const { fecha, action } = body;

    // If action is "autoload", fetch active reservations for this date
    if (action === "autoload") {
      // Get reservations for the given date with status IN ('confirmed', 'checked_in')
      const reservations = await getReservations({
        fromDate: fecha,
        toDate: fecha,
        status: undefined, // Will filter manually
      });

      // Filter for confirmed and checked_in status
      const activeReservations = reservations.filter(
        (r) => r.status === "confirmed" || r.status === "checked_in"
      );

      // Create meal consumption for each active reservation
      const consumptions = activeReservations.map((reservation) => ({
        meal_service_id: serviceId,
        guest_id: reservation.guest_id,
        reservation_id: reservation.id,
        company_id: reservation.company_id || null,
        eleccion: null,
        estado_whatsapp: "pendiente" as const,
      }));

      const created = await createBatchMealConsumption(consumptions);

      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 400 }
    );
  }
}
