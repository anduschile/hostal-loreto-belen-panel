import { createClient } from "@/lib/supabase/server";
import { MenuPrice, MenuPriceInsert } from "@/types/hostal";

const TABLE_NAME = "hostal_menu_prices";

export async function getPricesByMenu(menuId: number): Promise<MenuPrice[]> {
  const client = await createClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .eq("menu_id", menuId)
    .order("company_id", { ascending: true })
    .order("tipo_servicio", { ascending: true });

  if (error) throw new Error(`Failed to fetch menu prices: ${error.message}`);
  return data || [];
}

export async function getPriceForMenu(
  menuId: number,
  companyId: number | null,
  tipoServicio: "almuerzo" | "cena",
  fecha: string
): Promise<MenuPrice | null> {
  const client = await createClient();

  // First try to find exact match (menu_id, company_id, tipo_servicio, is_active)
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .eq("menu_id", menuId)
    .eq("company_id", companyId)
    .eq("tipo_servicio", tipoServicio)
    .eq("is_active", true)
    .lte("vigente_desde", fecha)
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code === "PGRST116") {
    // Not found, return null to fallback
    return null;
  }

  if (error) throw new Error(`Failed to fetch menu price: ${error.message}`);
  return data || null;
}

export async function createPrice(input: MenuPriceInsert): Promise<MenuPrice> {
  const client = await createClient();
  const payload = {
    menu_id: input.menu_id,
    company_id: input.company_id || null,
    tipo_servicio: input.tipo_servicio,
    precio: input.precio,
    vigente_desde: input.vigente_desde || new Date().toISOString().split("T")[0],
    is_active: input.is_active !== false,
  };

  const { data, error } = await client
    .from(TABLE_NAME)
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(`Failed to create price: ${error.message}`);
  return data;
}

export async function updatePrice(id: number, input: Partial<MenuPriceInsert>): Promise<MenuPrice> {
  const client = await createClient();
  const payload: any = {};

  if (input.precio !== undefined) payload.precio = input.precio;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  payload.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from(TABLE_NAME)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update price: ${error.message}`);
  return data;
}

export async function deletePrice(id: number): Promise<void> {
  const client = await createClient();
  const { error } = await client.from(TABLE_NAME).delete().eq("id", id);

  if (error) throw new Error(`Failed to delete price: ${error.message}`);
}
