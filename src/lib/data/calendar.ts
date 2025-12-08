import { createClient } from "@/lib/supabase/server";

export type CalendarRoom = {
    id: number;
    name: string;
    type: string;
    capacity: number;
    status: string;
};

export type CalendarReservation = {
    id: number;
    room_id: number;
    guest_id: number;
    company_id?: number | null;
    guest_name: string;
    company_name?: string | null;
    check_in: string; // YYYY-MM-DD
    check_out: string; // YYYY-MM-DD
    status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "blocked";
    total_price: number;
    notes?: string | null;
    adults: number;
    children: number;
    code?: string;
    source?: string;
    invoice_number?: string | null;
    invoice_status?: string;
    invoice_notes?: string | null;
    invoice_date?: string | null;
    companions_json?: any | null;
    company_name_snapshot?: string | null;
    billing_type?: string;
};

export type CalendarData = {
    rooms: CalendarRoom[];
    reservations: CalendarReservation[];
};

export type CalendarFilters = {
    status?: string | null;
    room_type?: string | null;
    company_id?: number | null;
};

export async function getCalendarData(
    from: string,
    to: string,
    filters?: CalendarFilters
): Promise<CalendarData> {
    const supabase = createClient();

    // 1. Habitaciones (ordenadas por sort_order y luego id)
    let roomsQuery = supabase
        .from("hostal_rooms")
        .select("id, name, room_type, capacity_adults, status")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

    if (filters?.room_type && filters.room_type !== "all") {
        roomsQuery = roomsQuery.eq("room_type", filters.room_type);
    }

    const { data: roomsData, error: roomsError } = await roomsQuery;

    if (roomsError) {
        console.error("Error fetching rooms for calendar:", roomsError);
        throw new Error(roomsError.message);
    }

    console.log(`[getCalendarData] Rooms fetched: ${roomsData?.length}`);

    // 2. Reservas en rango
    // Regla correcta de cruce:
    //   check_in <= to  AND  check_out >= from
    // así la reserva aparece en día, semana y mes.
    let resQuery = supabase
        .from("hostal_reservations")
        .select(
            `
      id, room_id, guest_id, company_id,
      check_in, check_out, status, total_price, notes,
      adults, children, code, source,
      invoice_number, invoice_status, invoice_notes, invoice_date, companions_json,
      company_name_snapshot, billing_type,
      hostal_guests ( full_name ),
      hostal_companies ( name )
    `
        )
        .lte("check_in", to)
        .gte("check_out", from);

    if (filters?.status && filters.status !== "all") {
        resQuery = resQuery.eq("status", filters.status);
    } else {
        if (filters?.status !== "cancelled") {
            resQuery = resQuery.neq("status", "cancelled");
        }
    }

    if (filters?.company_id) {
        resQuery = resQuery.eq("company_id", filters.company_id);
    }

    const { data: resData, error: resError } = await resQuery;

    if (resError) {
        console.error("Error fetching reservations for calendar:", resError);
        throw new Error(resError.message);
    }

    const rooms: CalendarRoom[] = (roomsData || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.room_type,
        capacity: r.capacity_adults,
        status: r.status,
    }));

    const reservations: CalendarReservation[] = (resData || []).map((r: any) => ({
        id: r.id,
        room_id: r.room_id,
        guest_id: r.guest_id,
        company_id: r.company_id,
        guest_name: r.hostal_guests?.full_name || "Sin Huésped",
        company_name: r.company_name_snapshot || r.hostal_companies?.name || null,
        check_in: r.check_in,
        check_out: r.check_out,
        status: r.status,
        total_price: r.total_price,
        notes: r.notes,
        adults: r.adults ?? 1,
        children: r.children ?? 0,
        code: r.code,
        source: r.source,
        invoice_number: r.invoice_number,
        invoice_status: r.invoice_status,
        invoice_notes: r.invoice_notes,
        invoice_date: r.invoice_date,
        companions_json: r.companions_json,
        company_name_snapshot: r.company_name_snapshot,
        billing_type: r.billing_type,
    }));

    return { rooms, reservations };
}
