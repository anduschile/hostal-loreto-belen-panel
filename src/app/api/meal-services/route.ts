import { NextResponse } from "next/server";
import { getMealServices, createMealService } from "@/lib/data/meal-services";
import { MealServiceSchema } from "@/lib/validators/meal-services";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from") || undefined;
    const toDate = searchParams.get("to") || undefined;
    const tipoServicio = searchParams.get("tipo_servicio") || undefined;

    const data = await getMealServices(fromDate, toDate, tipoServicio);

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = MealServiceSchema.parse(body);

    const created = await createMealService(parsed);

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 400 }
    );
  }
}
