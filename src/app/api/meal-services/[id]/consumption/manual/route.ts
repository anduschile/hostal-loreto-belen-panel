import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGuest } from "@/lib/data/guests";
import { createMealConsumption } from "@/lib/data/meal-consumption";
import { GuestInsert } from "@/types/hostal";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id, 10);
    const body = await req.json();

    const { guest_id, company_id } = body;

    if (!guest_id || typeof guest_id !== "number") {
      return NextResponse.json(
        { ok: false, error: "guest_id is required and must be a number" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Step 1: Verify meal service exists
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

    // Step 2: Verify guest exists
    const { data: guest, error: guestError } = await supabase
      .from("hostal_guests")
      .select("id")
      .eq("id", guest_id)
      .single();

    if (guestError || !guest) {
      return NextResponse.json(
        { ok: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    // Step 3: Check if this guest is already in this meal service
    const { data: existingConsumption } = await supabase
      .from("hostal_meal_consumption")
      .select("id")
      .eq("meal_service_id", serviceId)
      .eq("guest_id", guest_id)
      .single();

    if (existingConsumption) {
      return NextResponse.json(
        {
          ok: false,
          error: "Este huésped ya está en este servicio",
        },
        { status: 400 }
      );
    }

    // Step 4: Create the meal consumption record
    const finalCompanyId = company_id && company_id !== -1 ? company_id : null;
    const consumption = await createMealConsumption({
      meal_service_id: serviceId,
      guest_id: guest_id,
      reservation_id: null,
      company_id: finalCompanyId,
      eleccion: null,
      estado_whatsapp: "pendiente",
    });

    return NextResponse.json(
      { ok: true, data: consumption },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("Error in manual consumption creation:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
