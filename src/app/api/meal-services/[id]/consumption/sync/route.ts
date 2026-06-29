import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBatchMealConsumption } from "@/lib/data/meal-consumption";

export const dynamic = "force-dynamic";

// Deduplicate reservations by guest_id, keeping the one with the most recent check_in
function deduplicateReservationsByGuest(
  reservations: Array<{ id: number; guest_id: number; company_id: number | null; check_in: string; check_out: string }>
): Array<{ id: number; guest_id: number; company_id: number | null; check_in: string; check_out: string }> {
  const byGuest: {
    [guestId: number]: Array<{ id: number; guest_id: number; company_id: number | null; check_in: string; check_out: string }>;
  } = {};

  reservations.forEach((r) => {
    if (!byGuest[r.guest_id]) byGuest[r.guest_id] = [];
    byGuest[r.guest_id].push(r);
  });

  const deduped: Array<{ id: number; guest_id: number; company_id: number | null; check_in: string; check_out: string }> = [];

  Object.entries(byGuest).forEach(([guestId, reservs]) => {
    if (reservs.length === 1) {
      deduped.push(reservs[0]);
    } else {
      // Multiple reservations for same guest on same day
      // Sort by check_in descending to get the most recent (incoming) reservation
      const sorted = [...reservs].sort((a, b) => b.check_in.localeCompare(a.check_in));
      const selected = sorted[0];

      // Check if companies differ (potential billing ambiguity)
      const companies = new Set(reservs.map((r) => r.company_id));
      if (companies.size > 1) {
        console.warn(
          `[MealConsumption] Guest ${guestId} has multiple reservations on the same day from different companies. ` +
          `Using reservation ID ${selected.id} (check-in: ${selected.check_in}, company: ${selected.company_id}). ` +
          `All reservations: ${reservs.map((r) => `ID ${r.id} (${r.check_in}, company ${r.company_id})`).join("; ")}`
        );
      }

      deduped.push(selected);
    }
  });

  return deduped;
}

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
      .select("id, guest_id, company_id, status, check_in, check_out")
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

    // Deduplicate by guest_id: if a guest has multiple reservations on the same day
    // (e.g., checkout and checkin), use only the one with the most recent check_in
    const deduplicatedReservations = deduplicateReservationsByGuest(activeReservations);

    // Step 3: Check which guests are NOT already in meal_consumption for this service
    const guestIds = deduplicatedReservations.map((r) => r.guest_id);

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
    const newConsumptions = deduplicatedReservations
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

    // skippedCount is the number of guests already in the service
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
