import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBatchMealConsumption } from "@/lib/data/meal-consumption";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id, 10);
    const body = await req.json();

    const { fecha } = body;

    if (!fecha) {
      return NextResponse.json(
        { ok: false, error: "fecha is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Step 1: Fetch the meal service to verify it exists
    const { data: mealService, error: mealServiceError } = await supabase
      .from("hostal_meal_services")
      .select("id")
      .eq("id", serviceId)
      .single();

    if (mealServiceError || !mealService) {
      return NextResponse.json(
        { ok: false, error: "Meal service not found" },
        { status: 404 }
      );
    }

    // Step 2: Get active reservations for this date
    const { data: reservations, error: reservationsError } = await supabase
      .from("hostal_reservations")
      .select("id, guest_id, company_id, status")
      .lte("check_in", fecha)
      .gte("check_out", fecha)
      .in("status", ["confirmed", "checked_in"]);

    if (reservationsError) {
      throw new Error(`Failed to fetch reservations: ${reservationsError.message}`);
    }

    const activeReservations = reservations || [];

    if (activeReservations.length === 0) {
      return NextResponse.json(
        { ok: true, data: { added: 0, skipped: 0 } },
        { status: 200 }
      );
    }

    // Step 3: Check which guests are NOT already in meal_consumption for this service
    const guestIds = activeReservations.map((r) => r.guest_id);

    const { data: existingConsumptions, error: existingError } = await supabase
      .from("hostal_meal_consumption")
      .select("guest_id")
      .eq("meal_service_id", serviceId)
      .in("guest_id", guestIds);

    if (existingError) {
      throw new Error(`Failed to check existing consumptions: ${existingError.message}`);
    }

    const existingGuestIds = new Set(
      (existingConsumptions || []).map((c) => c.guest_id)
    );

    // Step 4: Create consumption only for NEW guests (not already in the service)
    const newConsumptions = activeReservations
      .filter((reservation) => !existingGuestIds.has(reservation.guest_id))
      .map((reservation) => ({
        meal_service_id: serviceId,
        guest_id: reservation.guest_id,
        reservation_id: reservation.id,
        company_id: reservation.company_id || null,
        eleccion: null,
        estado_whatsapp: "pendiente" as const,
      }));

    let addedCount = 0;

    if (newConsumptions.length > 0) {
      await createBatchMealConsumption(newConsumptions);
      addedCount = newConsumptions.length;
    }

    const skippedCount = existingGuestIds.size;

    return NextResponse.json(
      { ok: true, data: { added: addedCount, skipped: skippedCount } },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 400 }
    );
  }
}
