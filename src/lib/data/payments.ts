import { createClient } from "@/lib/supabase/server";
import type { Payment, PaymentInsert } from "@/types/hostal";

const PAYMENTS_TABLE = "hostal_payments";

export type GetPaymentsParams = {
  fromDate?: string; // "YYYY-MM-DD"
  toDate?: string;   // "YYYY-MM-DD"
};

// ==========================
// LECTURA (GET)
// ==========================

// Extendemos el tipo Payment para display en UI
export type PaymentWithDetails = Payment & {
  guest_name?: string;
  company_name?: string;
  billing_type?: string;
};

export async function getPayments(
  params: GetPaymentsParams = {}
): Promise<PaymentWithDetails[]> {
  const supabase = createClient();
  const { fromDate, toDate } = params;

  // Helper to get next day for inclusive query
  function getNextDay(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  let query = supabase
    .from(PAYMENTS_TABLE)
    .select(`
      *,
      hostal_reservations (
        id,
        billing_type,
        company_name_snapshot,
        hostal_guests (full_name),
        hostal_companies (name)
      )
    `)
    .order("payment_date", { ascending: false });

  if (fromDate) {
    query = query.gte("payment_date", fromDate);
  }
  if (toDate) {
    // Inclusive: < nextDay 00:00:00
    const nextDay = getNextDay(toDate);
    query = query.lt("payment_date", nextDay);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error getPayments:", error);
    throw new Error(error.message);
  }

  // Map results
  return (data ?? []).map((row: any) => {
    const p = mapRowToPayment(row);
    // Extract relations
    const res = row.hostal_reservations;
    const guestName = res?.hostal_guests?.full_name || "Huésped Desconocido";
    // Priority: snapshot -> linked company -> null
    const companyName = res?.company_name_snapshot || res?.hostal_companies?.name || null;
    const billingType = res?.billing_type || "particular";

    return {
      ...p,
      guest_name: guestName,
      company_name: companyName,
      billing_type: billingType,
    };
  });
}

// ==========================
// CREACIÓN (POST)
// ==========================

export async function createPayment(input: PaymentInsert): Promise<Payment> {
  const supabase = createClient();

  // Como ya validamos con Zod y los tipos coinciden con la BD (snake_case), 
  // insertamos directo.
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .insert(input)
    .select("*")
    .single();

  if (error) {
    console.error("Error createPayment:", error);
    throw new Error(error.message);
  }

  return mapRowToPayment(data);
}

// ==========================
// ACTUALIZACIÓN (PUT)
// ==========================

export async function updatePayment(
  id: number,
  input: Partial<PaymentInsert>
): Promise<Payment> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updatePayment:", error);
    throw new Error(error.message);
  }

  return mapRowToPayment(data);
}

// ==========================
// ELIMINACIÓN (DELETE)
// ==========================

export async function deletePayment(id: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(PAYMENTS_TABLE).delete().eq("id", id);

  if (error) {
    console.error("Error deletePayment:", error);
    throw new Error(error.message);
  }
}

// ==========================
// LOGICA DE DERIVACIÓN EXTERNA (AR/AP)
// ==========================

/**
 * Crea o actualiza los movimientos de "Cuentas por Cobrar" (AR) y "Cuentas por Pagar" (AP)
 * para una reserva externa.
 * 
 * Si payment_type no existe, usamos "pending" o un campo de notas para distinguirlo.
 * Asumiremos que el sistema de pagos actual permite entradas negativas o tiene un campo 'type'.
 * Si no tiene 'type', usaremos notas para etiquetarlo.
 * 
 * NOTA: Para no romper el esquema actual (PaymentInsert), si no existe campo 'transaction_type',
 * usaremos notas con un prefijo "[AR]" o "[AP]" y montos positivos/negativos o simplemente positivos.
 * 
 * PLAN:
 * - Buscar pagos existentes para esta reserva con notas que contengan "[DERIVACIÓN-COBRO]" o "[DERIVACIÓN-PAGO]"
 * - Si existen, actualizarlos.
 * - Si no, crearlos.
 */
export async function upsertExternalReservationPayments(
  reservation_id: number,
  supplier_name: string | null,
  sale_total: number,
  cost_total: number,
  check_in_date: string
) {
  const supabase = createClient();

  // 1. Buscar pagos existentes de esta derivación
  const { data: existing } = await supabase
    .from(PAYMENTS_TABLE)
    .select('*')
    .eq('reservation_id', reservation_id);

  // Identificamos por las notas (simple convention pattern)
  const arPayment = existing?.find((p: any) => p.notes?.includes("[DERIVACIÓN-COBRO]"));
  const apPayment = existing?.find((p: any) => p.notes?.includes("[DERIVACIÓN-PAGO]"));

  const date = check_in_date || new Date().toISOString().split('T')[0];

  // --- AR (Cuentas por Cobrar a Cliente/Empresa) ---
  // Representa el ingreso.
  const arData: Partial<PaymentInsert> = {
    reservation_id,
    amount: sale_total,
    currency: 'CLP',
    method: 'pendiente',
    document_type: 'ninguno',
    payment_date: date,
    notes: `[DERIVACIÓN-COBRO] Ingreso por servicio externo en ${supplier_name || '?'}`
  };

  if (arPayment) {
    await updatePayment(arPayment.id, arData);
  } else {
    if (sale_total > 0) await createPayment(arData as PaymentInsert);
  }

  // --- AP (Cuentas por Pagar a Proveedor) ---
  // Representa el costo. En un sistema simple de caja, podría ser un egreso (negativo or marked as expense).
  // Si la tabla payments es solo ingresos, esto podría ensuciar los totales si no se distingue.
  // Asumiremos que se registra como un movimiento con nota especial.
  // IDEALMENTE: Agregar columna 'type' ('INCOME', 'EXPENSE').
  // Si no podemos tocar DB de pagos, usaremos amount negativo para costo?
  // Riesgo: La UI podría no soportar negativos.
  // Usaremos amount positivo pero con nota explícita costo.

  // UPDATE: User asked to manage AR/AP. 
  // If I can't add columns easily to payments without breaking, usage of tags in notes is safest.

  const apData: Partial<PaymentInsert> = {
    reservation_id,
    amount: cost_total, // Mantener positivo numéricamente, pero logico es salida
    currency: 'CLP',
    method: 'pendiente',
    document_type: 'ninguno',
    payment_date: date,
    notes: `[DERIVACIÓN-PAGO] Costo proveedor externo: ${supplier_name || '?'}`
  };

  if (apPayment) {
    await updatePayment(apPayment.id, apData);
  } else {
    if (cost_total > 0) await createPayment(apData as PaymentInsert);
  }
}


// ==========================
// MAPEOS
// ==========================

function mapRowToPayment(row: any): Payment {
  return {
    id: row.id,
    reservation_id: row.reservation_id ?? 0,
    amount: row.amount ?? 0,
    currency: row.currency ?? "CLP",
    method: row.method,
    document_type: row.document_type ?? "ninguno",
    document_number: row.document_number,
    payment_date: row.payment_date, // Ahora confiamos en que la columna correcta es payment_date
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
