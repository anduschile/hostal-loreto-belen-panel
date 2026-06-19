import { NextResponse } from "next/server";
import { getMealConsumptionById, updateMealConsumption, deleteMealConsumption } from "@/lib/data/meal-consumption";
import { getMealServiceById } from "@/lib/data/meal-services";
import { getPriceForMenu } from "@/lib/data/menu-prices";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const consumptionId = parseInt(id, 10);
    const body = await req.json();

    const consumption = await getMealConsumptionById(consumptionId);
    if (!consumption) {
      return NextResponse.json(
        { ok: false, error: "Meal consumption not found" },
        { status: 404 }
      );
    }

    // If eleccion is being set, resolve price
    if (body.eleccion === "A" || body.eleccion === "B") {
      const mealService = await getMealServiceById(consumption.meal_service_id);
      if (!mealService) {
        throw new Error("Meal service not found");
      }

      // Determine which menu was chosen
      const menuId = body.eleccion === "A" ? mealService.menu_a_id : mealService.menu_b_id;

      // Try to resolve price using new model (company prices)
      let priceSnapshot: number | null = null;

      if (consumption.company_id) {
        const client = await createClient();
        const { data: company } = await client
          .from("hostal_companies")
          .select("precio_preferencial, precio_normal")
          .eq("id", consumption.company_id)
          .single();

        if (company) {
          const tipoPrecio = mealService.tipo_precio || "preferencial";
          priceSnapshot = tipoPrecio === "preferencial"
            ? company.precio_preferencial
            : company.precio_normal;
        }
      }

      // Fallback to old model if new model doesn't have price
      if (!priceSnapshot) {
        const companyPrice = await getPriceForMenu(
          menuId,
          consumption.company_id || null,
          mealService.tipo_servicio as "almuerzo" | "cena",
          mealService.fecha
        );

        if (companyPrice) {
          priceSnapshot = companyPrice.precio;
        } else if (consumption.company_id) {
          const publicPrice = await getPriceForMenu(
            menuId,
            null,
            mealService.tipo_servicio as "almuerzo" | "cena",
            mealService.fecha
          );

          if (publicPrice) {
            priceSnapshot = publicPrice.precio;
          }
        }
      }

      // Update payload with resolved price and menu_servido_id
      body.precio_snapshot = priceSnapshot;
      body.menu_servido_id = menuId;

      if (!priceSnapshot) {
        body.notas = "Precio no configurado, requiere revisión";
      }
    }

    const updated = await updateMealConsumption(consumptionId, body);

    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    console.error("[meal-consumption PUT] Error:", {
      message: e.message,
      code: e.code,
      details: e.details,
    });
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const consumptionId = parseInt(id, 10);

    const consumption = await getMealConsumptionById(consumptionId);
    if (!consumption) {
      return NextResponse.json(
        { ok: false, error: "Meal consumption not found" },
        { status: 404 }
      );
    }

    await deleteMealConsumption(consumptionId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[meal-consumption DELETE] Error:", {
      message: e.message,
      code: e.code,
    });
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 400 }
    );
  }
}
