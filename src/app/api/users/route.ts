import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
    try {
        const { data, error } = await supabase
            .from("hostal_users")
            .select("*")
            .order("id", { ascending: true });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validaciones basicas
        if (!body.full_name || !body.email || !body.role) {
            return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("hostal_users")
            .insert({
                full_name: body.full_name,
                email: body.email,
                role: body.role,
                is_active: body.is_active ?? true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();

        if (!body.id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

        const { data, error } = await supabase
            .from("hostal_users")
            .update({
                full_name: body.full_name,
                email: body.email,
                role: body.role,
                is_active: body.is_active,
                updated_at: new Date().toISOString()
            })
            .eq("id", body.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

        // Borrado logico (opcional) o fisico. El requerimiento dice "eliminar o marcar inactivo".
        // Hare borrado fisico si el usuario lo desea, pero por integridad a veces es mejor inactivo.
        // Voy a implementar borrado fisico pues la tabla tiene is_active para borrado logico via PUT.

        const { error } = await supabase
            .from("hostal_users")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
