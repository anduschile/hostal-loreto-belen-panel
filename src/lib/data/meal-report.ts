import { createClient } from "@/lib/supabase/server";

export interface MealReportRow {
  fecha: string;
  guest_full_name: string;
  company_name: string | null;
  tipo_servicio: string;
  menu_nombre: string;
  precio: number | null;
  precio_con_iva: number | null;
  eleccion: "A" | "B" | null;
  estado_servicio: "activo" | "anulado";
  tipo_precio?: string;
}

export interface MealReportSummary {
  company_name: string;
  almuerzos_qty: number;
  cenas_qty: number;
  total_almuerzos: number;
  total_cenas: number;
  total_general: number;
}

export async function getMealReportData(
  fromDate: string,
  toDate: string,
  companyId?: number,
  tipoServicio?: string | null
): Promise<MealReportRow[]> {
  const client = await createClient();

  // Step 1: Get meal service IDs in the date range
  let mealServicesQuery = client
    .from("hostal_meal_services")
    .select("id")
    .gte("fecha", fromDate)
    .lte("fecha", toDate);

  if (tipoServicio && tipoServicio !== "ambos") {
    mealServicesQuery = mealServicesQuery.eq("tipo_servicio", tipoServicio);
  }

  const { data: mealServices, error: mealServicesError } = await mealServicesQuery;

  if (mealServicesError) {
    throw new Error(`Failed to fetch meal services: ${mealServicesError.message}`);
  }

  const mealServiceIds = (mealServices || []).map((ms: any) => ms.id);

  if (mealServiceIds.length === 0) {
    return [];
  }

  // Step 2: Get meal consumption records for those meal services (regardless of choice status)
  let query = client
    .from("hostal_meal_consumption")
    .select(`
      hostal_meal_services(fecha, tipo_servicio),
      hostal_guests(full_name),
      hostal_companies(name),
      hostal_menus(nombre),
      precio_snapshot,
      eleccion,
      estado_servicio
    `)
    .in("meal_service_id", mealServiceIds);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch meal report: ${error.message}`);

  return (data || []).map((row: any) => {
    const precio = row.precio_snapshot || null;
    const precio_con_iva = precio !== null ? Math.round(precio * 1.19) : null;
    return {
      fecha: row.hostal_meal_services?.fecha || "",
      guest_full_name: row.hostal_guests?.full_name || "Desconocido",
      company_name: row.hostal_companies?.name || null,
      tipo_servicio: row.hostal_meal_services?.tipo_servicio || "",
      menu_nombre: row.hostal_menus?.nombre || "Desconocido",
      precio,
      precio_con_iva,
      eleccion: row.eleccion || null,
      estado_servicio: row.estado_servicio || "activo",
    };
  });
}

export async function getMealReportSummary(
  fromDate: string,
  toDate: string,
  companyId?: number
): Promise<MealReportSummary[]> {
  const client = await createClient();

  let query = client
    .from("hostal_meal_consumption")
    .select(`
      hostal_meal_services(fecha, tipo_servicio),
      hostal_companies(name),
      precio_snapshot
    `)
    .not("eleccion", "is", null)
    .gte("hostal_meal_services.fecha", fromDate)
    .lte("hostal_meal_services.fecha", toDate);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch meal report summary: ${error.message}`);

  // Group by company and tipo_servicio
  const grouped: { [key: string]: MealReportSummary } = {};

  (data || []).forEach((row: any) => {
    const companyName = row.hostal_companies?.name || "Sin empresa";
    const tipoServicio = row.hostal_meal_services?.tipo_servicio || "";
    const precio = row.precio_snapshot || 0;

    if (!grouped[companyName]) {
      grouped[companyName] = {
        company_name: companyName,
        almuerzos_qty: 0,
        cenas_qty: 0,
        total_almuerzos: 0,
        total_cenas: 0,
        total_general: 0,
      };
    }

    if (tipoServicio === "almuerzo") {
      grouped[companyName].almuerzos_qty += 1;
      grouped[companyName].total_almuerzos += precio;
    } else if (tipoServicio === "cena") {
      grouped[companyName].cenas_qty += 1;
      grouped[companyName].total_cenas += precio;
    }

    grouped[companyName].total_general += precio;
  });

  return Object.values(grouped);
}
