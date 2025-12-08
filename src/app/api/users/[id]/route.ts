
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// PATCH: Update user details (role, full_name)
// ID param is expected to be the supabase_user_id (UUID)
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();
        const { full_name, role } = body;
        const { id } = await params;

        // Update hostal_users
        const { error } = await supabaseAdmin
            .from("hostal_users")
            .update({ full_name, role })
            .eq("supabase_user_id", id);

        if (error) throw error;

        // Optionally update auth metadata
        await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: { full_name, role }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove user
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;

        // 1. Delete from hostal_users
        const { error: dbError } = await supabaseAdmin
            .from("hostal_users")
            .delete()
            .eq("supabase_user_id", id);

        if (dbError) throw dbError;

        // 2. Delete from Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) throw authError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
