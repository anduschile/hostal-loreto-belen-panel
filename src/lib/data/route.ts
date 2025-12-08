// src/app/api/housekeeping/route.ts

import { NextResponse } from "next/server";
import {
  getHousekeepingWithRoomsByDate,
  upsertHousekeepingEntry,
} from "@/lib/data/housekeeping";
import { HousekeepingStatus } from "@/types/hostal";

export const dynamic = "force-dynamic";

/**
 * GET /api/housekeeping
 * Obtiene el estado de limpieza de todas las habitaciones para una fecha.
 * @param request - La solicitud con un parámetro de query opcional `date`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  const date = dateParam
    ? dateParam
    : new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD

  try {
    const data = await getHousekeepingWithRoomsByDate(date);
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { message: "Error al obtener los datos de housekeeping", error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/housekeeping
 * Crea o actualiza el estado de limpieza de una habitación para una fecha.
 * @param request - La solicitud con el cuerpo JSON.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room_id, date, status, notes } = body;

    if (!room_id || !date || !status) {
      return NextResponse.json(
        { message: "Faltan campos requeridos: room_id, date, status" },
        { status: 400 }
      );
    }

    const newEntry = await upsertHousekeepingEntry({
      room_id,
      date,
      status: status as HousekeepingStatus,
      notes: notes || null,
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { message: "Error al guardar el estado de la habitación", error: errorMessage },
      { status: 500 }
    );
  }
}