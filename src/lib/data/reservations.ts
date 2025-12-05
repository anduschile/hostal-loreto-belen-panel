// src/lib/data/reservations.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ReservationStatus =
  | "hold"
  | "confirmada"
  | "checkin"
  | "checkout"
  | "cancelada";

export type Reservation = {
  id: number;
  code: string;
  room_id: number;
  guest_name: string | null;
  check_in: string;   // ISO date
  check_out: string;  // ISO date
  status: ReservationStatus;
  source: string | null;
  adults: number | null;
  children: number | null;
  created_at: string;
};

// Trae todas las reservas ordenadas por fecha de check_in
export async function fetchReservations(): Promise<Reservation[]> {
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
    console.error("Error fetchReservations:", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Reservation[];
}
