import { NextResponse } from "next/server";
import { getMealConsumptionByService, createBatchMealConsumption } from "@/lib/data/meal-consumption";
import { getReservations } from "@/lib/data/reservations";

export const dynamic = "force-dynamic";

// Deduplicate reservations by guest_id, keeping the one with the most recent check_in
// If a guest has multiple reservations on the same day (e.g., checkout and checkin),
// we create only one consumption record using the "incoming" reservation (most recent check_in)
interface ReservationWithCompanions {
  id: number;
  guest_id: number;
  company_id: number | null;
  check_in: string;
  check_out: string;
  companions_json?: Array<{ guest_id?: number; name?: string; full_name?: string }> | null;
}

function deduplicateReservationsByGuest(
  reservations: ReservationWithCompanions[]
): ReservationWithCompanions[] {
  const byGuest: {
    [guestId: number]: ReservationWithCompanions[];
  } = {};

  reservations.forEach((r) => {
    if (!byGuest[r.guest_id]) byGuest[r.guest_id] = [];
    byGuest[r.guest_id].push(r);
  });

  const deduped: ReservationWithCompanions[] = [];

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
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();

      // Check if there are multiple meal services of the same tipo_servicio for this fecha
      const { data: mealService, error: mealServiceError } = await supabase
        .from("hostal_meal_services")
        .select("id, tipo_servicio")
        .eq("id", serviceId)
        .single();

      if (mealServiceError || !mealService) {
        throw new Error("Meal service not found");
      }

      const { data: conflictingServices, error: conflictError } = await supabase
        .from("hostal_meal_services")
        .select("id")
        .eq("fecha", fecha)
        .eq("tipo_servicio", mealService.tipo_servicio);

      if (conflictError) {
        throw new Error(`Failed to check for conflicting services: ${conflictError.message}`);
      }

      // If there are multiple services of the same type on this date, skip autoload
      if ((conflictingServices?.length || 0) > 1) {
        return NextResponse.json({
          ok: false,
          error: "Hay múltiples servicios de " + mealService.tipo_servicio + " para esta fecha. Agrega huéspedes manualmente.",
          skipAutoload: true
        }, { status: 409 });
      }

      // Get reservations that cover the given date (check_in <= fecha AND check_out >= fecha)
      // with status IN ('confirmed', 'checked_in')
      // Include companions_json to expand companion guests into separate meal_consumption records
      const { data: reservations, error } = await supabase
        .from("hostal_reservations")
        .select("id, guest_id, company_id, status, check_in, check_out, companions_json")
        .lte("check_in", fecha)
        .gte("check_out", fecha)
        .in("status", ["confirmed", "checked_in"]);

      if (error) {
        throw new Error(`Failed to fetch reservations: ${error.message}`);
      }

      const activeReservations = reservations || [];

      // Deduplicate by guest_id: if a guest has multiple reservations on the same day
      // (e.g., checkout and checkin), use only the one with the most recent check_in
      const deduplicatedReservations = deduplicateReservationsByGuest(activeReservations);

      // Create meal consumption for each deduplicated reservation
      // Plus one for each companion in companions_json
      const consumptions: Array<{
        meal_service_id: number;
        guest_id: number;
        reservation_id: number;
        company_id: number | null;
        eleccion: null;
        estado_whatsapp: "pendiente";
      }> = [];

      const processedGuestIds = new Set<number>();

      deduplicatedReservations.forEach((reservation) => {
        // Add titular guest
        consumptions.push({
          meal_service_id: serviceId,
          guest_id: reservation.guest_id,
          reservation_id: reservation.id,
          company_id: reservation.company_id || null,
          eleccion: null,
          estado_whatsapp: "pendiente" as const,
        });
        processedGuestIds.add(reservation.guest_id);

        // Add companions from companions_json
        const companions = reservation.companions_json || [];
        (Array.isArray(companions) ? companions : []).forEach((companion: any) => {
          if (companion.guest_id && !processedGuestIds.has(companion.guest_id)) {
            consumptions.push({
              meal_service_id: serviceId,
              guest_id: companion.guest_id,
              reservation_id: reservation.id,
              company_id: reservation.company_id || null,
              eleccion: null,
              estado_whatsapp: "pendiente" as const,
            });
            processedGuestIds.add(companion.guest_id);
          }
        });
      });

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
