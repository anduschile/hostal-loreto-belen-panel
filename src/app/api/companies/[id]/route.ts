
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// PATCH: Update company
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await req.json();
        const { id } = await params;

        const { error } = await supabase
            .from("hostal_companies")
            .update({
                ...body,
                updated_at: new Date().toISOString()
            })
            .eq("id", id); // ID should be numeric based on table def

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Deactivate company (Soft Delete preference) or Hard Delete
// User requested toggle functionality, so usually PATCH is enough, but strictly implementing DELETE
// to map to deactivation as requested in Option A.
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Option A: Soft delete (set is_active = false)
        const { error } = await supabase
            .from("hostal_companies")
            .update({ is_active: false })
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
