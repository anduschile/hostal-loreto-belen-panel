import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET: List companies
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("hostal_companies")
            .select("*")
            .eq('is_active', true) // Only fetch active ones if we want to mimic the module, but the frontend filters too. Let's fetch all then frontend filters or filter here. The user said "Se apliquen los mismos filtros... is_active = true".
            // Actually the frontend does `data.filter((c: any) => c.is_active)`. 
            // Better to filter on DB side for performance, but to match existing frontend logic EXACTLY (which filters active), I can do it here. 
            // However, the frontend currently fetches ALL then filters. 
            // Let's just return all and let frontend filter, or return active. 
            // Given the user said "Use the same source... hostal_companies", implies getting everything available.
            // But usually for a dropdown we only want active.
            // The frontend code `setCompanies(data.filter((c: any) => c.is_active));` implies the API returned inactive ones too previously.
            // I will keep the select("*") but use admin.
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

        const { error } = await supabaseAdmin
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
