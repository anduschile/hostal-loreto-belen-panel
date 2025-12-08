import { createClient } from "@/lib/supabase/server";

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
}
