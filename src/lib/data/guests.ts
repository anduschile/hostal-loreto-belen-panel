import { createClient } from "@/lib/supabase/server";
import { Guest, GuestInsert } from "@/types/hostal";

const TABLE_NAME = "hostal_guests";

export async function getGuests(params: { search?: string } = {}) {
  const supabase = createClient();
  let query = supabase.from(TABLE_NAME).select("*").order("full_name", { ascending: true });

  if (params.search) {
    // Search by name, document or email
    query = query.or(`full_name.ilike.%${params.search}%,document_id.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Guest[];
}

export async function createGuest(guest: GuestInsert) {
  const supabase = createClient();
  const { data, error } = await supabase.from(TABLE_NAME).insert(guest).select().single();
  if (error) throw new Error(error.message);
  return data as Guest;
}

export async function updateGuest(id: number, updates: Partial<GuestInsert>) {
  const supabase = createClient();
  const { data, error } = await supabase.from(TABLE_NAME).update(updates).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as Guest;
}

export async function deleteGuest(id: number) {
  const supabase = createClient();
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
