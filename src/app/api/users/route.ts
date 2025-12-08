
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

// GET: List users
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("hostal_users")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create User
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, full_name, role } = body;

        // 1. Create in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("User creation failed in Auth");

        const userId = authData.user.id;

        // 2. Insert into hostal_users
        const { error: dbError } = await supabaseAdmin
            .from("hostal_users")
            .insert({
                supabase_user_id: userId,
                email,
                full_name,
                role,
            });

        if (dbError) {
            // Rollback: delete auth user if DB insert fails
            await supabaseAdmin.auth.admin.deleteUser(userId);
            throw dbError;
        }

        return NextResponse.json({ success: true, user: authData.user });
    } catch (error: any) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
