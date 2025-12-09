import { NextResponse } from "next/server";
import { getCalendarData } from "@/lib/data/calendar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        if (!from || !to) {
            return NextResponse.json({ ok: false, error: "Rango de fechas requerido" }, { status: 400 });
        }

        const status = searchParams.get("status");
        const roomType = searchParams.get("room_type");
        const companyId = searchParams.get("company_id") ? Number(searchParams.get("company_id")) : undefined;

        const data = await getCalendarData(from, to, {
            status: status === "all" ? null : status,
            room_type: roomType === "all" ? null : roomType,
            company_id: companyId
        });

        return NextResponse.json({
            ok: true,
            data: data
        });
    } catch (error: any) {
        console.error("GET /api/calendar error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Error al obtener calendario" },
            { status: 500 }
        );
    }
}
