
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use standard client for data operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or Service Role if strict RLS

const supabase = createClient(supabaseUrl, supabaseKey);

// GET: List companies
export async function GET() {
    try {
        const { data, error } = await supabase
            .from("hostal_companies")
            .select("*")
            .order("name", { ascending: true });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create company
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Basic validation
        if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
            return NextResponse.json({ error: "El nombre de la empresa es obligatorio." }, { status: 400 });
        }

        // Sanitization and defaults
        const companyData = {
            name: body.name.trim(),
            rut: body.rut?.trim() || null,
            contact_name: body.contact_name?.trim() || null,
            contact_email: body.contact_email?.trim() || null,
            contact_phone: body.contact_phone?.trim() || null,
            notes: body.notes?.trim() || null,
            discount_type: ['porcentaje', 'monto_fijo', 'ninguno'].includes(body.discount_type)
                ? body.discount_type
                : 'ninguno',
            discount_value: body.discount_type === 'ninguno'
                ? 0
                : (Number(body.discount_value) || 0),
            credit_days: Number(body.credit_days) || 0,
            is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from("hostal_companies")
            .insert(companyData);

        if (error) {
            console.error("Supabase insert error:", error);
            // Return specific DB error if possible, otherwise generic
            return NextResponse.json({ error: error.message || "Error al insertar la empresa en la base de datos." }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message || "Error interno del servidor." }, { status: 500 });
    }
}
