import { createClient } from "@/lib/supabase/server";

const TABLE_NAME = "hostal_reservations";

export type ReservationFilters = {
  fromDate?: string;
  toDate?: string;
  status?: string;
  roomId?: number;
  companyId?: number;
};

// ---------- HELPERS ----------

type ReservationDbPayload = {
  room_id?: number;
  guest_id?: number | null;
  company_id?: number | null;
  check_in?: string;
  check_out?: string;
  status?: string;
  total_price?: number | null;
  notes?: string | null;
  adults?: number | null;
  children?: number | null;
  code?: string | null;
  source?: string | null;
  invoice_number?: string | null;
  invoice_status?: string | null;
  invoice_notes?: string | null;
  invoice_date?: string | null;
  companions_json?: any | null;
  arrival_time?: string | null;
  breakfast_time?: string | null;
};

function mapToDb(input: any): ReservationDbPayload {
  if (!input) return {};

  const payload: ReservationDbPayload = {
    room_id: input.room_id,
    guest_id: input.guest_id ?? null,
    company_id: input.company_id ?? null,
    check_in: input.check_in,
    check_out: input.check_out,
    status: input.status,
    total_price:
      input.total_price === "" || input.total_price === undefined
        ? null
        : Number(input.total_price),
    notes: input.notes ?? null,
    adults: input.adults ?? null,
    children: input.children ?? null,
    source: input.source ?? null,
    invoice_number: input.invoice_number ?? null,
    invoice_status: input.invoice_status ?? null,
    invoice_notes: input.invoice_notes ?? null,
    invoice_date: input.invoice_date ?? null,
    companions_json: input.companions_json ?? null,
    arrival_time: input.arrival_time ?? null,
    breakfast_time: input.breakfast_time ?? null,
  };

  // Solo tocamos code si viene en el payload
  if (input.code !== undefined) {
    const trimmed = String(input.code).trim();
    payload.code = trimmed === "" ? null : trimmed;
  }

  return payload;
}

function generateCode(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `R${stamp}`;
}

// ---------- QUERIES PRINCIPALES ----------

export async function getReservations(filters: ReservationFilters = {}) {
  const supabase = createClient();

  let query = supabase
    .from(TABLE_NAME)
    .select(
      `
      id,
      room_id,
      guest_id,
      company_id,
      check_in,
      check_out,
      status,
      total_price,
      notes,
      adults,
      children,
      code,
      source,
      invoice_number,
      invoice_status,
      invoice_notes,
      invoice_date,
      companions_json,
      arrival_time,
      breakfast_time,
      hostal_rooms ( id, name, room_type, code ),
      hostal_guests ( id, full_name, phone ),
      hostal_companies ( id, name )
    `
    )
    .order("check_in", { ascending: true });

  const { fromDate, toDate, status, roomId, companyId } = filters;

  // 🔹 Filtro SIMPLE: check_in entre fromDate y toDate
  if (fromDate) {
    query = query.gte("check_in", fromDate);
  }
  if (toDate) {
    query = query.lte("check_in", toDate);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (roomId) {
    query = query.eq("room_id", roomId);
  }

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error getReservations:", error);
    throw new Error(error.message);
  }

  console.log(
    "[getReservations] filtros:",
    filters,
    " → filas:",
    data?.length ?? 0
  );

  return data || [];
}

export async function getReservationById(id: number) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(
      `
      id,
      room_id,
      guest_id,
      company_id,
      check_in,
      check_out,
      status,
      total_price,
      notes,
      adults,
      children,
      code,
      source,
      invoice_number,
      invoice_status,
      invoice_notes,
      invoice_date,
      companions_json,
      arrival_time,
      breakfast_time,
      hostal_rooms ( id, name, room_type, code ),
      hostal_guests ( id, full_name, phone ),
      hostal_companies ( id, name )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error getReservationById:", error);
    throw new Error(error.message);
  }

  return data;
}

// ---------- MUTACIONES ----------

export async function createReservation(payload: any) {
  const supabase = createClient();
  let dbPayload = mapToDb(payload);

  // Aseguramos code NO nulo
  if (!dbPayload.code || dbPayload.code === null) {
    dbPayload.code = generateCode();
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(dbPayload)
    .select()
    .single();

  if (error) {
    console.error("Error createReservation:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function updateReservation(id: number, payload: any) {
  const supabase = createClient();
  const dbPayload = mapToDb(payload);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(dbPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updateReservation:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function deleteReservation(id: number) {
  const supabase = createClient();

  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    console.error("Error deleteReservation:", error);
    throw new Error(error.message);
  }

  return true;
}
