import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reservationStatusSchema } from "@/lib/validators/reservation-status";
import { revalidatePath } from "next/cache";
import { guardOverlap, fetchStoredReservation } from "@/lib/reservations/overlapGuard";
import { appendNote } from "@/lib/reservations/overlap";
import { buildStatusUpdatePayload, notifyConfirmation, planStatusChange } from "@/lib/reservations/statusChange";
import { sendConfirmationEmail } from "@/lib/public-api/emails";

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

        const { status, allow_overlap } = validation.data;
        const reservationId = Number(id);

        if (isNaN(reservationId)) {
            return NextResponse.json(
                { ok: false, error: "ID de reserva inválido" },
                { status: 400 }
            );
        }

        // 1b. Solapamiento: cambiar de un estado ignorado (p. ej. cancelled) a uno que bloquea se valida;
        //     cancelar nunca se valida.
        const prev = await fetchStoredReservation(reservationId);
        if (!prev) {
            return NextResponse.json(
                { ok: false, error: "Reserva no encontrada" },
                { status: 404 }
            );
        }
        const guard = await guardOverlap({
            prev,
            next: { ...prev, status },
            excludeId: reservationId,
            allowOverlap: allow_overlap === true,
        });
        if ("response" in guard) return guard.response;

        // Solicitudes web: al confirmar o rechazar se limpia el hold; al confirmar además se avisa al huésped.
        const plan = planStatusChange(prev, status);
        const updatePayload = buildStatusUpdatePayload(
            status,
            plan,
            guard.notesLine ? appendNote(prev.notes, guard.notesLine) : null
        );

        // 2. Database Update
        const supabase = createClient();
        const { data, error } = await supabase
            .from("hostal_reservations")
            .update(updatePayload)
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

        // El correo nunca hace fallar el cambio de estado (notifyConfirmation no lanza).
        if (plan.sendConfirmation) {
            await notifyConfirmation(supabase as any, reservationId, sendConfirmationEmail);
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
