import { createClient } from "@/lib/supabase/server";
import { MealService, MealServiceInsert } from "@/types/hostal";

const TABLE_NAME = "hostal_meal_services";

export async function getMealServices(
  fromDate?: string,
  toDate?: string,
  tipoServicio?: string
): Promise<MealService[]> {
  const client = await createClient();
  let query = client.from(TABLE_NAME).select("*");

  if (fromDate) {
    query = query.gte("fecha", fromDate);
  }

  if (toDate) {
    query = query.lte("fecha", toDate);
  }

  if (tipoServicio) {
    query = query.eq("tipo_servicio", tipoServicio);
  }

  query = query.order("fecha", { ascending: false });

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch meal services: ${error.message}`);
  return data || [];
}

export async function getMealServiceById(id: number): Promise<MealService | null> {
  const client = await createClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch meal service: ${error.message}`);
  }

  return data || null;
}

export async function getMealServiceByFechaAndTipo(
  fecha: string,
  tipoServicio: string
): Promise<MealService | null> {
  const client = await createClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .eq("fecha", fecha)
    .eq("tipo_servicio", tipoServicio)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch meal service: ${error.message}`);
  }

  return data || null;
}

export async function createMealService(input: MealServiceInsert): Promise<MealService> {
  const client = await createClient();
  const payload = {
    fecha: input.fecha,
    tipo_servicio: input.tipo_servicio,
    menu_a_id: input.menu_a_id,
    menu_b_id: input.menu_b_id,
    notas: input.notas || null,
    created_by: input.created_by || null,
    tipo_precio: input.tipo_precio || 'preferencial',
  };

  const { data, error } = await client
    .from(TABLE_NAME)
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(`Failed to create meal service: ${error.message}`);
  return data;
}

export async function updateMealService(
  id: number,
  input: Partial<MealServiceInsert>
): Promise<MealService> {
  const client = await createClient();
  const payload: any = {};

  if (input.fecha !== undefined) payload.fecha = input.fecha;
  if (input.tipo_servicio !== undefined) payload.tipo_servicio = input.tipo_servicio;
  if (input.menu_a_id !== undefined) payload.menu_a_id = input.menu_a_id;
  if (input.menu_b_id !== undefined) payload.menu_b_id = input.menu_b_id;
  if (input.notas !== undefined) payload.notas = input.notas || null;
  if (input.tipo_precio !== undefined) payload.tipo_precio = input.tipo_precio;

  payload.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from(TABLE_NAME)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update meal service: ${error.message}`);
  return data;
}

export async function deleteMealService(id: number): Promise<void> {
  const client = await createClient();
  const { error } = await client.from(TABLE_NAME).delete().eq("id", id);

  if (error) throw new Error(`Failed to delete meal service: ${error.message}`);
}
