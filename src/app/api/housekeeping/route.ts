// src/app/api/housekeeping/route.ts
import { NextResponse } from "next/server";
import {
  getHousekeepingWithRoomsByDate,
  upsertHousekeepingEntry,
} from "@/lib/data/housekeeping";
import type { HousekeepingStatus } from "@/types/hostal";

function getTodayISODate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || getTodayISODate();

  try {
    const data = await getHousekeepingWithRoomsByDate(date);
    return NextResponse.json({ date, items: data });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message ?? "Error al obtener housekeeping.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const room_id = Number(body.room_id);
    const date = body.date as string | undefined;
    const status = body.status as HousekeepingStatus | undefined;
    const notes = (body.notes as string | null | undefined) ?? null;

    if (!room_id || Number.isNaN(room_id)) {
      return NextResponse.json(
        { message: "room_id es requerido y debe ser numérico." },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { message: "date es requerido (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { message: "status es requerido." },
        { status: 400 }
      );
    }

    const entry = await upsertHousekeepingEntry({
      room_id,
      date,
      status,
      notes,
      created_at: "", // no usado en upsert
      updated_at: "",
      id: 0, // no usado en upsert
    } as any); // cast para reutilizar tipo

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error("Error in POST /api/housekeeping:", error);
    return NextResponse.json(
      {
        message: error?.message ?? "Error al guardar estado de housekeeping.",
      },
      { status: 500 }
    );
  }
}
