import { supabase } from "@/lib/supabaseClient";

export type DashboardStats = {
    occupancyPercentage: number;
    arrivalsToday: number;
    departuresToday: number;
    incomeToday: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Total habitaciones activas
    const { count: totalRooms } = await supabase
        .from("hostal_rooms")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

    // 2. Habitaciones ocupadas hoy (reservas que incluyen 'today' en su rango y están confirmadas/checkin)
    // Simplificación: Check si hay reservas con estado "confirmed" o "checked_in" que pasen por hoy.
    // Como es complejo filtrar rangos exactos en una sola query simple, haremos una aproximacion:
    // Reservas donde check_in <= today AND check_out > today
    // (Asumiendo que si sales hoy, ya no cuenta como ocupada la noche de hoy, o depende del criterio hora. Usualmente checkout libera).

    const { count: occupied } = await supabase
        .from("hostal_reservations")
        .select("*", { count: "exact", head: true })
        .in("status", ["confirmed", "checked_in"])
        .lte("check_in", today)
        .gt("check_out", today);

    // 3. Llegadas hoy
    const { count: arrivals } = await supabase
        .from("hostal_reservations")
        .select("*", { count: "exact", head: true })
        .eq("check_in", today)
        .neq("status", "cancelled");

    // 4. Salidas hoy
    const { count: departures } = await supabase
        .from("hostal_reservations")
        .select("*", { count: "exact", head: true })
        .eq("check_out", today)
        .neq("status", "cancelled");

    // 5. Pagos hoy
    // Usamos hostal_payments.date si es el campo de negocio, o created_at si es por caja. El requerimiento dice "date".
    const { data: payments } = await supabase
        .from("hostal_payments")
        .select("amount")
        .eq("date", today);

    const totalIncome = payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    const roomCount = totalRooms || 1; // Evitar division por 0
    const occupancyPercentage = Math.round(((occupied || 0) / roomCount) * 100);

    return {
        occupancyPercentage,
        arrivalsToday: arrivals || 0,
        departuresToday: departures || 0,
        incomeToday: totalIncome,
    };
}
