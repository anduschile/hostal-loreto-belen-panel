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
