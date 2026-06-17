import { NextResponse } from "next/server";
import { getMenuById, updateMenu, deleteMenu } from "@/lib/data/menus";
import { MenuUpdateSchema } from "@/lib/validators/menus";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const menuId = parseInt(id, 10);

    const data = await getMenuById(menuId);

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Menu not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const menuId = parseInt(id, 10);
    const body = await req.json();

    // Add id to body for validation
    const parsed = MenuUpdateSchema.parse({ ...body, id: menuId });

    const updated = await updateMenu(menuId, parsed);

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
    const { id } = await params;
    const menuId = parseInt(id, 10);

    await deleteMenu(menuId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
