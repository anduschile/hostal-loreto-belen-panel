import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
    occupancyTodayPercent: number;
    occupiedRoomsToday: number;
    totalRooms: number;
    pendingCheckinsToday: number;
    monthlyIncome: number;
};

export async function getDashboardStats(today: string): Promise<DashboardStats> {
    const supabase = createClient();

    // 1. Total Rooms (Active)
    // Assuming 'archivada' means removed/inactive.
    const { count: totalRooms, error: roomsError } = await supabase
        .from("hostal_rooms")
        .select("id", { count: "exact", head: true })
        .neq("status", "archivada");

    if (roomsError) {
        console.error("Error fetching total rooms:", roomsError);
    }

    const safeTotalRooms = totalRooms ?? 0;

    // 2. Occupied Rooms Today
    // Logic: check_in <= today < check_out
    // Status NOT IN ('cancelled', 'blocked', 'checked_out', 'deleted')
    // We include 'pending', 'confirmed', 'checked_in'.
    // 'pending' reservations occupy space on the calendar.
    const { count: occupiedCount, error: occupError } = await supabase
        .from("hostal_reservations")
        .select("room_id", { count: "exact", head: true })
        .lte("check_in", today)
        .gt("check_out", today)
        .not("status", "in", "('cancelled','blocked','checked_out')");

    if (occupError) {
        console.error("Error fetching occupied rooms:", occupError);
    }

    const safeOccupiedCount = occupiedCount ?? 0;

    const occupancyTodayPercent = safeTotalRooms > 0
        ? Number(((safeOccupiedCount / safeTotalRooms) * 100).toFixed(1))
        : 0;

    // 3. Pending Check-ins Today
    // Logic: check_in == today AND status IN ('pending', 'confirmed')
    const { count: pendingCheckins, error: pendingError } = await supabase
        .from("hostal_reservations")
        .select("id", { count: "exact", head: true })
        .eq("check_in", today)
        .in("status", ["pending", "confirmed"]);

    if (pendingError) {
        console.error("Error fetching pending checkins:", pendingError);
    }

    // 4. Monthly Income
    const dateObj = new Date(today);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth(); // 0-indexed

    // First day of month
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    // Last day of month
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    const { data: payments, error: paymentsError } = await supabase
        .from("hostal_payments")
        .select("amount")
        .gte("payment_date", startOfMonth)
        .lte("payment_date", endOfMonth);

    if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
    }

    const monthlyIncome = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;

    return {
        occupancyTodayPercent,
        occupiedRoomsToday: safeOccupiedCount,
        totalRooms: safeTotalRooms,
        pendingCheckinsToday: pendingCheckins ?? 0,
        monthlyIncome,
    };
}
