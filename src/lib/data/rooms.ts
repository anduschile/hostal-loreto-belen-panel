import { createClient } from "@/lib/supabase/server";
import { HostalRoom, RoomInsert } from "@/types/hostal";

const TABLE_NAME = "hostal_rooms";

export async function getRooms(
    params: { status?: string; type?: string; search?: string } = {}
) {
    const supabase = createClient();

    // ⚠️ IMPORTANTE: ahora ordenamos por sort_order, luego por id
    let query = supabase
        .from(TABLE_NAME)
        .select("*")
        .order("sort_order", { ascending: true }) // orden lógico de las habitaciones
        .order("id", { ascending: true }); // desempate / fallback

    if (params.status) query = query.eq("status", params.status);
    if (params.type) query = query.eq("room_type", params.type);
    if (params.search) query = query.ilike("name", `%${params.search}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as HostalRoom[];
}

export async function createRoom(room: RoomInsert) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(room)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as HostalRoom;
}

export async function updateRoom(id: number, updates: Partial<RoomInsert>) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as HostalRoom;
}

export async function deleteRoom(id: number) {
    const supabase = createClient();
    // Optional check: check if reserved?
    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
    if (error) throw new Error(error.message);
}
