import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reservationStatusSchema } from "@/lib/validators/reservation-status";
import { revalidatePath } from "next/cache";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        // 1. Zod Validation
        const validation = reservationStatusSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { ok: false, error: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { status } = validation.data;
        const reservationId = Number(id);

        if (isNaN(reservationId)) {
            return NextResponse.json(
                { ok: false, error: "ID de reserva inválido" },
                { status: 400 }
            );
        }

        // 2. Database Update
        const supabase = createClient();
        const { data, error } = await supabase
            .from("hostal_reservations")
            .update({ status })
            .eq("id", reservationId)
            .select()
            .single();

        if (error) {
            console.error("Error actualizando estado:", error);
            return NextResponse.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { ok: false, error: "Reserva no encontrada" },
                { status: 404 }
            );
        }

        // Optional: Revalidate paths if caching is aggressive
        revalidatePath("/panel/libro-dia");
        revalidatePath("/panel/reservas");

        return NextResponse.json({ ok: true, data });

    } catch (error: any) {
        console.error("Server Error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Error interno" },
            { status: 500 }
        );
    }
}
