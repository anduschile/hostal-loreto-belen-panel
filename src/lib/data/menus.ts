import { createClient } from "@/lib/supabase/server";
import { HostalMenu, MenuInsert } from "@/types/hostal";

const TABLE_NAME = "hostal_menus";

export async function getMenus(search?: string): Promise<HostalMenu[]> {
  const client = await createClient();
  let query = client.from(TABLE_NAME).select("*");

  if (search) {
    query = query.ilike("nombre", `%${search}%`);
  }

  query = query.order("nombre", { ascending: true });

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch menus: ${error.message}`);
  return data || [];
}

export async function getMenuById(id: number): Promise<HostalMenu | null> {
  const client = await createClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch menu: ${error.message}`);
  }

  return data || null;
}

export async function createMenu(input: MenuInsert): Promise<HostalMenu> {
  const client = await createClient();
  const payload = {
    nombre: input.nombre,
    descripcion: input.descripcion || null,
    foto_url: input.foto_url || null,
    ingredientes: input.ingredientes || null,
    is_active: input.is_active !== false,
  };

  const { data, error } = await client
    .from(TABLE_NAME)
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(`Failed to create menu: ${error.message}`);
  return data;
}

export async function updateMenu(id: number, input: Partial<MenuInsert>): Promise<HostalMenu> {
  const client = await createClient();
  const payload: any = {};

  if (input.nombre !== undefined) payload.nombre = input.nombre;
  if (input.descripcion !== undefined) payload.descripcion = input.descripcion || null;
  if (input.foto_url !== undefined) payload.foto_url = input.foto_url || null;
  if (input.ingredientes !== undefined) payload.ingredientes = input.ingredientes || null;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  payload.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from(TABLE_NAME)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update menu: ${error.message}`);
  return data;
}

export async function deleteMenu(id: number): Promise<void> {
  const client = await createClient();

  // Check if menu is referenced in meal services (as menu_a_id or menu_b_id)
  const { count: mealServicesCount, error: checkError1 } = await client
    .from("hostal_meal_services")
    .select("id", { count: "exact", head: true })
    .or(`menu_a_id.eq.${id},menu_b_id.eq.${id}`);

  if (checkError1) {
    throw new Error(`Failed to check meal services: ${checkError1.message}`);
  }

  // Check if menu is referenced in meal consumption (as menu_servido_id)
  const { count: mealConsumptionCount, error: checkError2 } = await client
    .from("hostal_meal_consumption")
    .select("id", { count: "exact", head: true })
    .eq("menu_servido_id", id);

  if (checkError2) {
    throw new Error(`Failed to check meal consumption: ${checkError2.message}`);
  }

  // Build error if menu is in use anywhere
  const inMealServices = (mealServicesCount && mealServicesCount > 0) || false;
  const inMealConsumption = (mealConsumptionCount && mealConsumptionCount > 0) || false;

  if (inMealServices || inMealConsumption) {
    const usageList = [];

    if (inMealServices) {
      usageList.push(`${mealServicesCount} servicio${mealServicesCount === 1 ? "" : "s"} programado${mealServicesCount === 1 ? "" : "s"}`);
    }

    if (inMealConsumption) {
      usageList.push(`${mealConsumptionCount} registro${mealConsumptionCount === 1 ? "" : "s"} de consumo`);
    }

    throw new Error(`No se puede eliminar el menú. Está siendo usado en: ${usageList.join(" y ")}.`);
  }

  // Safe to delete
  const { error } = await client.from(TABLE_NAME).delete().eq("id", id);

  if (error) throw new Error(`Failed to delete menu: ${error.message}`);
}
