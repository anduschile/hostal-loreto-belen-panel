import { NextResponse } from "next/server";
import { getMealConsumptionById, updateMealConsumption } from "@/lib/data/meal-consumption";
import { getMealServiceById } from "@/lib/data/meal-services";
import { getPriceForMenu } from "@/lib/data/menu-prices";

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

      // Try to resolve price
      let precio = 0;
      let priceSnapshot: number | null = null;

      // First try: company-specific price
      const companyPrice = await getPriceForMenu(
        menuId,
        consumption.company_id || null,
        mealService.tipo_servicio as "almuerzo" | "cena",
        mealService.fecha
      );

      if (companyPrice) {
        priceSnapshot = companyPrice.precio;
        precio = companyPrice.precio;
      } else if (consumption.company_id) {
        // Second try: public price (company_id = null)
        const publicPrice = await getPriceForMenu(
          menuId,
          null,
          mealService.tipo_servicio as "almuerzo" | "cena",
          mealService.fecha
        );

        if (publicPrice) {
          priceSnapshot = publicPrice.precio;
          precio = publicPrice.precio;
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
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 400 }
    );
  }
}
