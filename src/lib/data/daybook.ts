import { createClient } from "@/lib/supabase/server";

const RESERVATIONS_TABLE = "hostal_reservations";

export type DaybookEntry = {
    id: number;
    room_id: number;
    room_name?: string | null;
    room_type?: string | null;
    guest_name?: string | null;
    company_name?: string | null; // Si existiera relación
    check_in: string;
    check_out: string;
    status: string;
    invoice_status: "pending" | "invoiced" | "partial";
    invoice_number: string | null;
    invoice_date: string | null;
    total_price: number;
    // Extra fields for Modal
    guest_id: number;
    company_id?: number | null;
    notes?: string | null;
    adults?: number;
    children?: number;
    source?: string;
    companions_json?: any | null;
    arrival_time?: string | null;
    breakfast_time?: string | null;
};

// ==========================
// LECTURA (GET)
// ==========================

export async function getDaybook(date: string): Promise<DaybookEntry[]> {
    const supabase = createClient();

    // "Libro del día": reservas activas en esa fecha.
    // Una reserva está activa si: check_in <= date < check_out
    // OJO: Si CheckIn=Hoy -> Activa. Si CheckOut=Hoy -> Salida (aún activa en la mañana, pero depende del criterio).
    // Criterio hotelero std: "In House" = (Start <= Date) AND (End > Date).
    // Si End == Date, es el día de salida (checkout).

    // Consulta JOIN manual ya que Supabase infiere FKs a veces, pero para asegurar:
    // Necesitamos nombre habitacion y huesped.

    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select(`
      id, room_id, guest_id, company_id, check_in, check_out, status, total_price,
      invoice_status, invoice_number, invoice_date, notes, adults, children, source, companions_json,
      arrival_time, breakfast_time,
      hostal_rooms (name, room_type, sort_order),
      hostal_guests (full_name)
    `)
        .lte("check_in", date)
        .gte("check_out", date)
        .not("status", "eq", "cancelled");

    if (error) {
        console.error("Error getDaybook:", error);
        throw new Error(error.message);
    }

    // Mapear resultado plano y ORDENAR por sort_order de la habitación
    const mapped = (data ?? []).map((row: any) => ({
        id: row.id,
        room_id: row.room_id,
        room_name: row.hostal_rooms?.name || `Hab ${row.room_id}`,
        room_type: row.hostal_rooms?.room_type || "Estándar",
        guest_name: row.hostal_guests?.full_name || "Sin Huésped",
        company_name: null,
        check_in: row.check_in,
        check_out: row.check_out,
        status: row.status,
        invoice_status: row.invoice_status || "pending",
        invoice_number: row.invoice_number,
        invoice_date: row.invoice_date,
        total_price: row.total_price || 0,
        // Extras
        guest_id: row.guest_id,
        company_id: row.company_id,
        notes: row.notes,
        adults: row.adults,
        children: row.children,
        source: row.source,
        companions_json: row.companions_json,
        arrival_time: row.arrival_time,
        breakfast_time: row.breakfast_time,
        // Internal for sorting
        _sort_order: row.hostal_rooms?.sort_order ?? 999
    }));

    // Sort by _sort_order (1..12)
    mapped.sort((a: any, b: any) => a._sort_order - b._sort_order);

    return mapped;
}

// ==========================
// ACTUALIZACIÓN DE FACTURA
// ==========================

export async function updateDaybookInvoice(params: {
    reservationId: number | string;
    invoice_status?: "pending" | "invoiced" | "partial";
    invoice_number?: string;
    invoice_date?: string;
}): Promise<void> {
    const supabase = createClient();
    const { reservationId, ...updates } = params;

    // Filtrar undefineds
    const payload: any = {};
    if (updates.invoice_status !== undefined) payload.invoice_status = updates.invoice_status;
    if (updates.invoice_number !== undefined) payload.invoice_number = updates.invoice_number;
    if (updates.invoice_date !== undefined) payload.invoice_date = updates.invoice_date;

    const { error } = await supabase
        .from(RESERVATIONS_TABLE)
        .update(payload)
        .eq("id", reservationId);

    if (error) {
        console.error("Error updateDaybookInvoice:", error);
        throw new Error(error.message);
    }
}
