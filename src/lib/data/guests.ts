// src/lib/data/guests.ts
import { createClient } from "@supabase/supabase-js";
import type { Guest } from "@/types/hostal";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Datos para creación y actualización
type GuestCreationData = Omit<Guest, "id" | "created_at" | "updated_at">;
type GuestUpdateData = Partial<GuestCreationData>;

// Lista todos los huéspedes
export async function getGuests(): Promise<Guest[]> {
  const { data, error } = await supabase
    .from("hostal_guests")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching guests:", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Guest[];
}

// Obtiene un huésped por id
export async function getGuestById(id: number): Promise<Guest | null> {
  const { data, error } = await supabase
    .from("hostal_guests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // Código de "no rows" de PostgREST
    if ((error as any).code === "PGRST116") {
      return null;
    }
    console.error(`Error fetching guest with id ${id}:`, error);
    throw new Error(error.message);
  }

  return data as Guest;
}

// Crea huésped
export async function createGuest(
  guestData: GuestCreationData
): Promise<Guest> {
  const { data, error } = await supabase
    .from("hostal_guests")
    .insert([guestData])
    .select()
    .single();

  if (error) {
    console.error("Error creating guest:", error);
    throw new Error(error.message);
  }

  return data as Guest;
}

// Actualiza huésped
export async function updateGuest(
  id: number,
  guestData: GuestUpdateData
): Promise<Guest> {
  const { data, error } = await supabase
    .from("hostal_guests")
    .update({
      ...guestData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating guest with id ${id}:`, error);
    throw new Error(error.message);
  }

  return data as Guest;
}

// Elimina huésped
export async function deleteGuest(id: number): Promise<void> {
  const { error } = await supabase
    .from("hostal_guests")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`Error deleting guest with id ${id}:`, error);
    throw new Error(error.message);
  }
}
