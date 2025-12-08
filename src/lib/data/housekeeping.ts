// src/lib/data/housekeeping.ts
import { createClient } from "@supabase/supabase-js";
import type { HousekeepingEntry, HousekeepingStatus, HostalRoom } from "@/types/hostal";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getHousekeepingByDate(
  date: string
): Promise<HousekeepingEntry[]> {
  const { data, error } = await supabase
    .from("hostal_housekeeping")
    .select("*")
    .eq("date", date)
    .order("room_id", { ascending: true });

  if (error) {
    console.error("Error fetching housekeeping:", error);
    throw new Error(error.message);
  }

  return (data ?? []) as HousekeepingEntry[];
}

export async function upsertHousekeepingEntry(
  payload: Omit<HousekeepingEntry, "id" | "created_at" | "updated_at">
): Promise<HousekeepingEntry> {
  const { data, error } = await supabase
    .from("hostal_housekeeping")
    .upsert(
      {
        room_id: payload.room_id,
        date: payload.date,
        status: payload.status,
        notes: payload.notes ?? null,
      },
      {
        onConflict: "room_id,date",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting housekeeping entry:", error);
    throw new Error(error.message);
  }

  return data as HousekeepingEntry;
}

export type HousekeepingWithRoom = {
  housekeeping_id: number | null;
  room_id: number;
  room_name: string;
  room_code: string;
  status: HousekeepingStatus | null;
  notes: string | null;
};

export async function getHousekeepingWithRoomsByDate(
  date: string
): Promise<HousekeepingWithRoom[]> {
  // 1) Traer todas las habitaciones
  const { data: rooms, error: roomsError } = await supabase
    .from("hostal_rooms")
    .select("id, name, code")
    .order("id", { ascending: true });

  if (roomsError) {
    console.error("Error fetching rooms for housekeeping:", roomsError);
    throw new Error(roomsError.message);
  }

  const typedRooms = (rooms ?? []) as Pick<HostalRoom, "id" | "name" | "code">[];

  // 2) Traer housekeeping de esa fecha
  const { data: hk, error: hkError } = await supabase
    .from("hostal_housekeeping")
    .select("*")
    .eq("date", date);

  if (hkError) {
    console.error("Error fetching housekeeping entries:", hkError);
    throw new Error(hkError.message);
  }

  const hkEntries = (hk ?? []) as HousekeepingEntry[];

  // 3) Combinar en memoria
  const result: HousekeepingWithRoom[] = typedRooms.map((room) => {
    const entry = hkEntries.find((e) => e.room_id === room.id) || null;

    return {
      housekeeping_id: entry ? entry.id : null,
      room_id: room.id,
      room_name: room.name,
      room_code: room.code,
      status: (entry?.status as HousekeepingStatus) ?? null,
      notes: entry?.notes ?? null,
    };
  });

  return result;
}
