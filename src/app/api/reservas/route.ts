// src/app/api/reservas/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET /api/reservas -> lista todas las reservas
export async function GET() {
  const { data, error } = await supabase
    .from("hostal_reservations")
    .select(
      `
      id,
      code,
      room_id,
      guest_name,
      check_in,
      check_out,
      status,
      source,
      adults,
      children,
      created_at
    `
    )
    .order("check_in", { ascending: true });

  if (error) {
    console.error("GET /api/reservas error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

// POST /api/reservas -> crear reserva básica (con regla anti-solape)
export async function POST(req: Request) {
  const body = await req.json();

  const {
    code,
    room_id,
    guest_name,
    check_in,
    check_out,
    status,
    adults,
    children,
    source,
  } = body;

  // Validaciones mínimas obligatorias
  if (!room_id || !guest_name || !check_in || !check_out) {
    return NextResponse.json(
      { error: "Faltan datos obligatorios (habitación, huésped, fechas)." },
      { status: 400 }
    );
  }

  // -------- REGLA ANTI-SOLAPE --------
  // Traemos reservas activas de esa habitación y revisamos solapes en JS
  const { data: existing, error: overlapError } = await supabase
    .from("hostal_reservations")
    .select("id, code, check_in, check_out, status")
    .eq("room_id", room_id)
    .in("status", ["hold", "confirmada", "checkin"]);

  if (overlapError) {
    console.error("Error verificando solapes:", overlapError);
    return NextResponse.json(
      { error: overlapError.message },
      { status: 500 }
    );
  }

  const newCheckIn = new Date(check_in);
  const newCheckOut = new Date(check_out);

  const overlapping = (existing ?? []).find((r: any) => {
    const existingCheckIn = new Date(r.check_in);
    const existingCheckOut = new Date(r.check_out);

    // Hay solape si: existingCheckIn < newCheckOut && existingCheckOut > newCheckIn
    return (
      existingCheckIn < newCheckOut &&
      existingCheckOut > newCheckIn
    );
  });

  if (overlapping) {
    return NextResponse.json(
      {
        error:
          `Ya existe una reserva que se solapa en esta habitación ` +
          `(código ${overlapping.code || overlapping.id}). ` +
          `Revisa las fechas antes de crear una nueva reserva.`,
      },
      { status: 400 }
    );
  }
  // -------- FIN REGLA ANTI-SOLAPE --------

  // Si no viene código desde el front, generamos uno
  const reservationCode =
    typeof code === "string" && code.trim() !== ""
      ? code
      : `LB-${new Date().getFullYear()}-${Math.floor(Math.random() * 9999)
          .toString()
          .padStart(4, "0")}`;

  // Si no viene estado, usamos "hold" (pre-reserva)
  const reservationStatus =
    typeof status === "string" && status.trim() !== ""
      ? status
      : "hold";

  const { data, error } = await supabase
    .from("hostal_reservations")
    .insert([
      {
        code: reservationCode,
        room_id,
        guest_name,
        check_in,
        check_out,
        status: reservationStatus,
        // Valores por defecto para columnas NOT NULL
        source: source ?? "panel", // origen de la reserva
        adults: adults ?? 1,        // si no viene, asumimos 1 adulto
        children: children ?? 0,    // si no viene, asumimos 0 niños
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("POST /api/reservas error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/reservas -> actualizar una reserva (por id en el body)
export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Falta el id de la reserva a actualizar." },
      { status: 400 }
    );
  }

  // Limpiamos campos undefined para no sobreescribir cosas sin querer
  const updateFields: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updateFields[key] = value;
    }
  }

  const { data, error } = await supabase
    .from("hostal_reservations")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("PATCH /api/reservas error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

// DELETE /api/reservas -> eliminar una reserva (por id en el body)
export async function DELETE(req: Request) {
  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Falta el id de la reserva a eliminar." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("hostal_reservations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE /api/reservas error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
