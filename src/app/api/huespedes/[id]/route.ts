// src/app/api/huespedes/[id]/route.ts
import { NextResponse } from "next/server";
import {
  getGuestById,
  updateGuest,
  deleteGuest,
} from "@/lib/data/guests";

interface Params {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    const guest = await getGuestById(id);
    if (!guest) {
      return NextResponse.json(
        { message: "Huésped no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(guest);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Error al obtener huésped." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updatedGuest = await updateGuest(id, body);
    return NextResponse.json(updatedGuest);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Error al actualizar huésped." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    await deleteGuest(id);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Error al eliminar huésped." },
      { status: 500 }
    );
  }
}
