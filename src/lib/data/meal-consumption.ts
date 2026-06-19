import { createClient } from "@/lib/supabase/server";
import { MealConsumption, MealConsumptionInsert, MealChoiceType } from "@/types/hostal";

const TABLE_NAME = "hostal_meal_consumption";

export async function getMealConsumptionByService(
  mealServiceId: number
): Promise<MealConsumption[]> {
  const client = await createClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .eq("meal_service_id", mealServiceId)
    .order("guest_id", { ascending: true });

  if (error) throw new Error(`Failed to fetch meal consumption: ${error.message}`);
  return data || [];
}

export async function getMealConsumptionById(id: number): Promise<MealConsumption | null> {
  const client = await createClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch meal consumption: ${error.message}`);
  }

  return data || null;
}

export async function createMealConsumption(
  input: MealConsumptionInsert
): Promise<MealConsumption> {
  const client = await createClient();
  const payload = {
    meal_service_id: input.meal_service_id,
    guest_id: input.guest_id,
    reservation_id: input.reservation_id || null,
    company_id: input.company_id || null,
    eleccion: input.eleccion || null,
    estado_whatsapp: input.estado_whatsapp || "pendiente",
    whatsapp_enviado_at: input.whatsapp_enviado_at || null,
    precio_snapshot: input.precio_snapshot || null,
    menu_servido_id: input.menu_servido_id || null,
    notas: input.notas || null,
  };

  const { data, error } = await client
    .from(TABLE_NAME)
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(`Failed to create meal consumption: ${error.message}`);
  return data;
}

export async function createBatchMealConsumption(
  inputs: MealConsumptionInsert[]
): Promise<MealConsumption[]> {
  const client = await createClient();

  const payloads = inputs.map((input) => ({
    meal_service_id: input.meal_service_id,
    guest_id: input.guest_id,
    reservation_id: input.reservation_id || null,
    company_id: input.company_id || null,
    eleccion: input.eleccion || null,
    estado_whatsapp: input.estado_whatsapp || "pendiente",
    whatsapp_enviado_at: input.whatsapp_enviado_at || null,
    precio_snapshot: input.precio_snapshot || null,
    menu_servido_id: input.menu_servido_id || null,
    notas: input.notas || null,
  }));

  const { data, error } = await client
    .from(TABLE_NAME)
    .insert(payloads)
    .select();

  if (error) throw new Error(`Failed to create meal consumptions: ${error.message}`);
  return data || [];
}

export async function updateMealConsumption(
  id: number,
  input: {
    eleccion?: MealChoiceType | null;
    estado_whatsapp?: string;
    whatsapp_enviado_at?: string | null;
    precio_snapshot?: number | null;
    menu_servido_id?: number | null;
    notas?: string | null;
  }
): Promise<MealConsumption> {
  const client = await createClient();
  const payload: any = {};

  if (input.eleccion !== undefined) payload.eleccion = input.eleccion;
  if (input.estado_whatsapp !== undefined) payload.estado_whatsapp = input.estado_whatsapp;
  if (input.whatsapp_enviado_at !== undefined) payload.whatsapp_enviado_at = input.whatsapp_enviado_at;
  if (input.precio_snapshot !== undefined) payload.precio_snapshot = input.precio_snapshot;
  if (input.menu_servido_id !== undefined) payload.menu_servido_id = input.menu_servido_id;
  if (input.notas !== undefined) payload.notas = input.notas;

  payload.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from(TABLE_NAME)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update meal consumption: ${error.message}`);
  return data;
}

export async function deleteMealConsumption(id: number): Promise<void> {
  const client = await createClient();
  const { error } = await client.from(TABLE_NAME).delete().eq("id", id);

  if (error) throw new Error(`Failed to delete meal consumption: ${error.message}`);
}

export async function deleteBatchMealConsumption(mealServiceId: number): Promise<void> {
  const client = await createClient();
  const { error } = await client
    .from(TABLE_NAME)
    .delete()
    .eq("meal_service_id", mealServiceId);

  if (error) throw new Error(`Failed to delete meal consumptions: ${error.message}`);
}
