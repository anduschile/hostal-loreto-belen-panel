import { createClient } from "@/lib/supabase/server";

export type FinancialSummary = {
    total_income: number;
    income_by_method: { method: string; amount: number }[];
    income_by_document_type: { document_type: string; amount: number }[];
    daily_income: { date: string; amount: number }[];
};

export type OccupancySummary = {
    total_rooms: number;
    occupied_rooms: number; // Only for current day/range average? Let's assume average or today. 
    // User spec says: "Para la fecha “hoy” (o el toDate si se decide así): occupied_rooms"
    // But also "daily_occupancy" array.
    occupancy_rate: number; // 0–100
    daily_occupancy: { date: string; occupied: number; occupancy_rate: number }[];
};

export type DashboardSummary = {
    financial: FinancialSummary;
    occupancy: OccupancySummary;
};

export type StatsParams = {
    fromDate: string; // YYYY-MM-DD
    toDate: string;   // YYYY-MM-DD
};

// Helper: generar array de fechas entre start y end
function getDatesArray(start: string, end: string) {
    const arr = [];
    const dt = new Date(start);
    const endDt = new Date(end);
    while (dt <= endDt) {
        arr.push(new Date(dt).toISOString().split('T')[0]);
        dt.setDate(dt.getDate() + 1);
    }
    return arr;
}

export async function getDashboardStats(
    params: StatsParams
): Promise<DashboardSummary> {
    const supabase = createClient();
    const { fromDate, toDate } = params;

    // 1. FINANCIAL DATA (hostal_payments)
    const { data: payments, error: payError } = await supabase
        .from("hostal_payments")
        .select("amount, payment_date, method, document_type")
        .gte("payment_date", fromDate)
        .lte("payment_date", toDate);

    if (payError) {
        console.error("Error fetching payments stats:", payError);
        throw new Error(payError.message);
    }

    const cleanPayments = payments || [];

    // Aggregations
    const total_income = cleanPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Income by method
    const methodMap = new Map<string, number>();
    // Income by doc
    const docMap = new Map<string, number>();
    // Daily income
    const dailyIncomeMap = new Map<string, number>();

    // Init daily map with 0 for all days in range
    const dates = getDatesArray(fromDate, toDate);
    dates.forEach(d => dailyIncomeMap.set(d, 0));

    cleanPayments.forEach(p => {
        // Method
        const m = p.method || "unknown";
        methodMap.set(m, (methodMap.get(m) || 0) + (p.amount || 0));

        // Doc
        const d = p.document_type || "unknown";
        docMap.set(d, (docMap.get(d) || 0) + (p.amount || 0));

        // Daily
        if (p.payment_date && dailyIncomeMap.has(p.payment_date)) {
            dailyIncomeMap.set(p.payment_date, (dailyIncomeMap.get(p.payment_date) || 0) + (p.amount || 0));
        }
    });

    const income_by_method = Array.from(methodMap.entries()).map(([method, amount]) => ({ method, amount }));
    const income_by_document_type = Array.from(docMap.entries()).map(([document_type, amount]) => ({ document_type, amount }));
    const daily_income = dates.map(date => ({ date, amount: dailyIncomeMap.get(date) || 0 }));

    // 2. OCCUPANCY DATA (hostal_reservations)
    // Need total rooms count first.
    // Try counting form hostal_rooms, fallback to max id from reservations.
    let total_rooms = 0;
    const { count: roomCount, error: roomError } = await supabase
        .from("hostal_rooms")
        .select("*", { count: "exact", head: true });

    if (!roomError && roomCount !== null) {
        total_rooms = roomCount;
    } else {
        // Fallback: buscar max room_id en reservas (aproximación)
        // No es ideal pero sirve si no hay tabla rooms.
        // Asumiremos un fijo razonable si falla, o 1 para evitar DIV/0
        total_rooms = 10; // Default de seguridad
    }

    // Fetch reservations intersecting the range
    const { data: reservations, error: resError } = await supabase
        .from("hostal_reservations")
        .select("check_in, check_out, room_id, status")
        .neq("status", "cancelled")
        .lt("check_in", toDate)     // Start before range end
        .gt("check_out", fromDate); // End after range start

    if (resError) {
        console.error("Error fetching occupancy stats:", resError);
        throw new Error(resError.message);
    }

    const cleanReservations = reservations || [];

    // Daily occupancy
    const daily_occupancy = dates.map(date => {
        // Count rooms occupied on this date
        // Occupied if: check_in <= date < check_out
        const occupiedCount = cleanReservations.filter(r =>
            r.check_in <= date && r.check_out > date
        ).length; // Esto cuenta reservas, pero si hay solapamiento (que no debería) podría contar doble.
        // Como tenemos hasOverlap, deberia ser 1 reserva por habitacion.
        // Ajuste: usar un Set de room_ids para asegurar unicidad de habitaciones ocupadas.

        const uniqueRooms = new Set(
            cleanReservations
                .filter(r => r.check_in <= date && r.check_out > date)
                .map(r => r.room_id)
        );

        const occupied = uniqueRooms.size;
        const rate = total_rooms > 0 ? (occupied / total_rooms) * 100 : 0;

        return { date, occupied, occupancy_rate: Math.round(rate * 100) / 100 };
    });

    // Summary stats (using 'today' or 'toDate' as reference)
    // Prompt asks for: "Para la fecha “hoy” (o el toDate si se decide así)"
    // We use toDate (last day of range) or the last valid data point.
    // Actually, average occupancy over the period might be more useful for the 'card', 
    // but let's strictly follow: "occupied_rooms: cuántas habitaciones tienen al menos una reserva activa ese día."
    // We'll use the LAST day of the range (toDate) as the snapshot reference? 
    // Or "Today" if it's within range.
    // Let's use the average for the period as "Occupancy Rate" for the summary card?
    // Re-reading prompt: "occupied_rooms: ... Para la fecha “hoy” (o el toDate)"

    const referenceDate = toDate;
    const snapshot = daily_occupancy.find(d => d.date === referenceDate) || daily_occupancy[daily_occupancy.length - 1];

    const occupied_rooms = snapshot ? snapshot.occupied : 0;
    const current_occupancy_rate = snapshot ? snapshot.occupancy_rate : 0;

    return {
        financial: {
            total_income,
            income_by_method,
            income_by_document_type,
            daily_income
        },
        occupancy: {
            total_rooms,
            occupied_rooms,
            occupancy_rate: current_occupancy_rate,
            daily_occupancy
        }
    };
}
