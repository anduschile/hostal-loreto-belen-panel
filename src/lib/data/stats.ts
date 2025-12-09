import { createClient } from "@/lib/supabase/server";

type CompanyJoin = { name: string } | { name: string }[] | null;

export type FinancialSummary = {
    total_income: number;
    transaction_count: number;
    rev_par: number; // Ingreso por habitación disponible
    income_by_method: { method: string; amount: number }[];
    income_by_document_type: { document_type: string; amount: number }[];
    daily_income: { date: string; amount: number }[];
};

export type OccupancySummary = {
    total_rooms: number;
    occupied_rooms: number;
    occupancy_rate: number; // 0–100 (Avg for range)
    daily_occupancy: { date: string; occupied: number; occupancy_rate: number }[];
};

export type CompanySummary = {
    id: number;
    name: string;
    total_revenue: number;
    reservation_count: number;
};

export type DashboardSummary = {
    financial: FinancialSummary;
    occupancy: OccupancySummary;
    top_companies: CompanySummary[];
};

export type DetailedStats = DashboardSummary & {
    occupancy_by_room_type: { type: string; total: number; occupied: number; rate: number }[];
    all_companies: CompanySummary[];
};

export type StatsParams = {
    fromDate: string; // YYYY-MM-DD
    toDate: string;   // YYYY-MM-DD
};

// Helper: generar array de fechas entre start y end
function getDatesArray(start: string, end: string) {
    const arr = [];
    const dt = new Date(start + "T00:00:00");
    const endDt = new Date(end + "T00:00:00");
    let safeGuard = 0;
    while (dt <= endDt && safeGuard < 3660) {
        arr.push(dt.toISOString().split('T')[0]); // YYYY-MM-DD
        dt.setDate(dt.getDate() + 1);
        safeGuard++;
    }
    return arr;
}

// Helper: Get strictly next day string yyyy-mm-dd for exclusive upper bound
function getNextDay(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

export async function getDashboardStats(
    params: StatsParams
): Promise<DashboardSummary> {
    const supabase = createClient();
    const { fromDate, toDate } = params;

    const dates = getDatesArray(fromDate, toDate);
    const daysCount = dates.length || 1;

    // Calculate next day for inclusive upper bound queries
    const nextDay = getNextDay(toDate);

    // --- 1. FINANCIAL DATA (hostal_payments) ---
    // Inclusive: >= fromDate 00:00 AND < nextDay 00:00
    const { data: payments, error: payError } = await supabase
        .from("hostal_payments")
        .select("amount, payment_date, method, document_type")
        .gte("payment_date", fromDate)
        .lt("payment_date", nextDay);

    if (payError) {
        console.error("Error fetching payments stats:", payError);
        throw new Error(payError.message);
    }

    const cleanPayments = payments || [];
    const total_income = cleanPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const transaction_count = cleanPayments.length;

    // Aggregations
    const methodMap = new Map<string, number>();
    const docMap = new Map<string, number>();
    const dailyIncomeMap = new Map<string, number>();

    dates.forEach(d => dailyIncomeMap.set(d, 0));

    cleanPayments.forEach(p => {
        // Payments might have timestamps, we slice to YYYY-MM-DD to group
        const dayStr = p.payment_date ? p.payment_date.split('T')[0] : "";

        const m = p.method || "Desconocido";
        methodMap.set(m, (methodMap.get(m) || 0) + (p.amount || 0));

        const d = p.document_type || "Desconocido";
        docMap.set(d, (docMap.get(d) || 0) + (p.amount || 0));

        if (dayStr && dailyIncomeMap.has(dayStr)) {
            dailyIncomeMap.set(dayStr, (dailyIncomeMap.get(dayStr) || 0) + (p.amount || 0));
        }
    });

    const income_by_method = Array.from(methodMap.entries())
        .map(([method, amount]) => ({ method, amount }))
        .sort((a, b) => b.amount - a.amount);

    const income_by_document_type = Array.from(docMap.entries())
        .map(([document_type, amount]) => ({ document_type, amount }))
        .sort((a, b) => b.amount - a.amount);

    const daily_income = dates.map(date => ({ date, amount: dailyIncomeMap.get(date) || 0 }));


    // --- 2. OCCUPANCY DATA (hostal_reservations + hostal_rooms) ---
    let total_rooms = 0;
    const { count: roomCount, error: roomError } = await supabase
        .from("hostal_rooms")
        .select("*", { count: "exact", head: true });

    if (!roomError && roomCount !== null) {
        total_rooms = roomCount;
    } else {
        total_rooms = 12;
    }

    // Reservation candidates:
    // Started before end of window (check_in < nextDay)
    // AND Ended after start of window (check_out > fromDate)
    const { data: reservations, error: resError } = await supabase
        .from("hostal_reservations")
        .select(`
            id, check_in, check_out, room_id, status, total_price, 
            company_id, billing_type, company_name_snapshot,
            hostal_companies (id, name)
        `)
        .neq("status", "cancelled")
        .lt("check_in", nextDay)
        .gt("check_out", fromDate);

    if (resError) {
        console.error("Error fetching occupancy stats:", resError);
        throw new Error(resError.message);
    }
    const cleanReservations = reservations || [];

    // Daily occupancy
    let sumOccupancyRate = 0;
    const daily_occupancy = dates.map(date => {
        const uniqueRooms = new Set(
            cleanReservations
                .filter(r => r.check_in <= date && r.check_out > date)
                .map(r => r.room_id)
        );

        const occupied = uniqueRooms.size;
        const rate = total_rooms > 0 ? (occupied / total_rooms) * 100 : 0;
        sumOccupancyRate += rate;

        return { date, occupied, occupancy_rate: Math.round(rate * 100) / 100 };
    });

    const avg_occupancy_rate = daysCount > 0 ? (sumOccupancyRate / daysCount) : 0;
    const total_room_nights = total_rooms * daysCount;
    const rev_par = total_room_nights > 0 ? (total_income / total_room_nights) : 0;


    // --- 3. TOP COMPANIES ---
    const companyMap = new Map<number, { name: string; revenue: number; count: number }>();

    cleanReservations.forEach(r => {
        if (r.billing_type === 'empresa' || r.company_id) {
            const compId = r.company_id || 0;
            const companies = r.hostal_companies as unknown as CompanyJoin;

            let fetchedName: string | undefined;
            if (Array.isArray(companies)) {
                fetchedName = companies[0]?.name;
            } else if (companies) {
                fetchedName = companies.name;
            }

            const compName = r.company_name_snapshot || fetchedName || "Empresa Desconocida";

            if (compId) {
                const current = companyMap.get(compId) || { name: compName, revenue: 0, count: 0 };
                current.revenue += (r.total_price || 0);
                current.count += 1;
                companyMap.set(compId, current);
            }
        }
    });

    const top_companies = Array.from(companyMap.entries())
        .map(([id, data]) => ({
            id,
            name: data.name,
            total_revenue: data.revenue,
            reservation_count: data.count
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);


    return {
        financial: {
            total_income,
            transaction_count,
            rev_par: Math.round(rev_par),
            income_by_method,
            income_by_document_type,
            daily_income
        },
        occupancy: {
            total_rooms,
            occupied_rooms: daily_occupancy[daily_occupancy.length - 1]?.occupied || 0,
            occupancy_rate: Math.round(avg_occupancy_rate * 100) / 100,
            daily_occupancy
        },
        top_companies
    };
}

export async function getDetailedStats(params: StatsParams): Promise<DetailedStats> {
    const dashboard = await getDashboardStats(params);
    const supabase = createClient();
    const { fromDate, toDate } = params;
    const nextDay = getNextDay(toDate);

    // --- Companies (All) ---
    // Same overlap logic as dashboard but fetch all (no slice later)
    const { data: reservations, error: resError } = await supabase
        .from("hostal_reservations")
        .select(`
            id, total_price, company_id, billing_type, company_name_snapshot,
            hostal_companies (id, name)
        `)
        .neq("status", "cancelled")
        .lt("check_in", nextDay)
        .gt("check_out", fromDate);

    if (resError) throw new Error(resError.message);
    const cleanReservations = reservations || [];

    const companyMap = new Map<number, { name: string; revenue: number; count: number }>();
    cleanReservations.forEach(r => {
        if (r.billing_type === 'empresa' || r.company_id) {
            const compId = r.company_id || 0;
            const companies = r.hostal_companies as unknown as CompanyJoin;

            let fetchedName: string | undefined;
            if (Array.isArray(companies)) {
                fetchedName = companies[0]?.name;
            } else if (companies) {
                fetchedName = companies.name;
            }

            const compName = r.company_name_snapshot || fetchedName || "Empresa Desconocida";

            if (compId) {
                const cur = companyMap.get(compId) || { name: compName, revenue: 0, count: 0 };
                cur.revenue += (r.total_price || 0);
                cur.count += 1;
                companyMap.set(compId, cur);
            }
        }
    });

    const all_companies = Array.from(companyMap.entries())
        .map(([id, data]) => ({
            id,
            name: data.name,
            total_revenue: data.revenue,
            reservation_count: data.count
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);


    // --- Occupancy by Room Type ---
    // Need room types
    const { data: rooms } = await supabase.from("hostal_rooms").select("id, room_type");
    const allRooms = rooms || [];
    const typeMap = new Map<string, { total_nights: number, occupied_nights: number }>();

    // Init
    allRooms.forEach(r => {
        if (!typeMap.has(r.room_type)) typeMap.set(r.room_type, { total_nights: 0, occupied_nights: 0 });
    });

    const dates = getDatesArray(fromDate, toDate);
    const daysCount = dates.length;

    // Total Capacity
    for (const type of typeMap.keys()) {
        const count = allRooms.filter(r => r.room_type === type).length;
        const current = typeMap.get(type)!;
        current.total_nights = count * daysCount;
    }

    // Occupied Capacity
    const { data: occResData } = await supabase.from("hostal_reservations")
        .select(`id, check_in, check_out, room_id`)
        .neq("status", "cancelled")
        .lt("check_in", nextDay)
        .gt("check_out", fromDate);

    const occReservations = occResData || [];
    const roomTypeMap = new Map<number, string>();
    allRooms.forEach(r => roomTypeMap.set(r.id, r.room_type));

    dates.forEach(date => {
        const uniqueRoomIds = new Set(
            occReservations
                .filter(r => r.check_in <= date && r.check_out > date)
                .map(r => r.room_id)
        );

        uniqueRoomIds.forEach(rid => {
            const type = roomTypeMap.get(rid);
            if (type) {
                const stats = typeMap.get(type);
                if (stats) {
                    stats.occupied_nights += 1;
                }
            }
        });
    });

    const occupancy_by_room_type = Array.from(typeMap.entries()).map(([type, stats]) => ({
        type,
        total: stats.total_nights,
        occupied: stats.occupied_nights,
        rate: stats.total_nights > 0 ? (stats.occupied_nights / stats.total_nights) * 100 : 0
    })).sort((a, b) => b.rate - a.rate);

    return {
        ...dashboard,
        all_companies,
        occupancy_by_room_type
    };
}
