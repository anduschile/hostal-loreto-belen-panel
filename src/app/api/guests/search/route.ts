import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const queryText = searchParams.get("q");

        if (!queryText || queryText.length < 2) {
            return NextResponse.json({ ok: true, data: [] });
        }

        const supabase = createClient();

        // Search by name (case insensitive) OR document_id
        // We limit to 15 results for performance
        const { data, error } = await supabase
            .from("hostal_guests")
            .select("id, full_name, document_id, email, phone")
            .or(`full_name.ilike.%${queryText}%,document_id.ilike.%${queryText}%`)
            .limit(15);

        if (error) {
            throw new Error(error.message);
        }

        return NextResponse.json({ ok: true, data: data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
