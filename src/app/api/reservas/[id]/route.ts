// src/app/api/reservas/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Params = {
  params: { id: string };
};

// PATCH /api/reservas/:id -> actualizar campos de una reserva
export async function PATCH(req: Request, { params }: Params) {
  const id = Number(params.id);
  const body = await req.json();

  const { data, error } = await supabase
    .from("hostal_reservations")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("PATCH /api/reservas/:id error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

// DELETE /api/reservas/:id -> eliminar reserva
export async function DELETE(_req: Request, { params }: Params) {
  const id = Number(params.id);

  const { error } = await supabase
    .from("hostal_reservations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE /api/reservas/:id error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
