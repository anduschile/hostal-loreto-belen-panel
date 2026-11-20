import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/guests-log?from=YYYY-MM-DD&to=YYYY-MM-DD
// Misma consulta que antes hacía GuestsLogClient desde el navegador.
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        if (!from || !to) {
            return NextResponse.json({ error: "Parámetros from y to requeridos" }, { status: 400 });
        }

        const supabase = createClient();
        const { data, error } = await supabase
            .from("hostal_reservations")
            .select(`
                id, check_in, check_out, status, notes, source,
                hostal_rooms (name),
                hostal_guests (full_name, document_id)
            `)
            .gte("check_in", from)
            .lte("check_in", to)
            .order("check_in", { ascending: false });

        if (error) throw error;

        return NextResponse.json(data ?? []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
