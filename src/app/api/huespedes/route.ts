// src/app/api/huespedes/route.ts
import { NextResponse } from "next/server";
import { getGuests, createGuest } from "@/lib/data/guests";
import type { Guest } from "@/types/hostal";

export async function GET() {
  try {
    const guests = await getGuests();
    return NextResponse.json(guests);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Error al obtener huéspedes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.full_name) {
      return NextResponse.json(
        { message: "El nombre completo es requerido." },
        { status: 400 }
      );
    }

    const newGuestData: Omit<Guest, "id" | "created_at" | "updated_at"> = {
      full_name: body.full_name,
      document_id: body.document_id || null,
      email: body.email || null,
      phone: body.phone || null,
      country: body.country || null,
      notes: body.notes || null,
      is_active:
        body.is_active !== undefined && body.is_active !== null
          ? body.is_active
          : true,
    };

    const newGuest = await createGuest(newGuestData);
    return NextResponse.json(newGuest, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Error al crear huésped." },
      { status: 500 }
    );
  }
}
