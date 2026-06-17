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
      // Get reservations that cover the given date (check_in <= fecha AND check_out >= fecha)
      // with status IN ('confirmed', 'checked_in')
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();

      const { data: reservations, error } = await supabase
        .from("hostal_reservations")
        .select("id, guest_id, company_id, status")
        .lte("check_in", fecha)
        .gte("check_out", fecha)
        .in("status", ["confirmed", "checked_in"]);

      if (error) {
        throw new Error(`Failed to fetch reservations: ${error.message}`);
      }

      const activeReservations = reservations || [];

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
