import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/data/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        // Default: Mes actual (1ro al día actual)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];

        let from = searchParams.get("from");
        let to = searchParams.get("to");

        if (!from) from = firstDay;
        if (!to) to = today;

        // Simple validation
        if (isNaN(Date.parse(from)) || isNaN(Date.parse(to))) {
            return NextResponse.json({ ok: false, error: "Fechas inválidas" }, { status: 400 });
        }

        const stats = await getDashboardStats({ fromDate: from, toDate: to });

        return NextResponse.json({
            ok: true,
            data: stats
        });

    } catch (error: any) {
        console.error("GET /api/stats/dashboard error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Error interno" },
            { status: 500 }
        );
    }
}
