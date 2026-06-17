import { NextResponse } from "next/server";
import { getPricesByMenu, createPrice, updatePrice, deletePrice } from "@/lib/data/menu-prices";
import { MenuPriceSchema, MenuPriceUpdateSchema } from "@/lib/validators/menus";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const menuId = parseInt(id, 10);

    const data = await getPricesByMenu(menuId);

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
    const menuId = parseInt(id, 10);
    const body = await req.json();

    const parsed = MenuPriceSchema.parse({ ...body, menu_id: menuId });

    const created = await createPrice(parsed);

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 400 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { ok: false, error: "Price ID is required" },
        { status: 400 }
      );
    }

    const parsed = MenuPriceUpdateSchema.parse({ ...body, id: priceId });

    const updated = await updatePrice(priceId, {
      precio: parsed.precio,
      is_active: parsed.is_active,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
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
    const { searchParams } = new URL(req.url);
    const priceId = searchParams.get("priceId");

    if (!priceId) {
      return NextResponse.json(
        { ok: false, error: "Price ID is required" },
        { status: 400 }
      );
    }

    await deletePrice(parseInt(priceId, 10));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
