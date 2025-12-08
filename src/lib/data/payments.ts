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

export async function getPayments(
  params: GetPaymentsParams = {}
): Promise<Payment[]> {
  const supabase = createClient();
  const { fromDate, toDate } = params;

  let query = supabase
    .from(PAYMENTS_TABLE)
    .select("*")
    .order("payment_date", { ascending: false });

  if (fromDate) {
    query = query.gte("payment_date", fromDate);
  }
  if (toDate) {
    query = query.lte("payment_date", toDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error getPayments:", error);
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRowToPayment(row));
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
