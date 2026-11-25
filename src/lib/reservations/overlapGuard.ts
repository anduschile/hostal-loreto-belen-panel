// Validación de solapamiento en el SERVIDOR antes de escribir en hostal_reservations.
// La regla vive en overlap.ts (función pura); aquí solo se consulta la base y se decide la respuesta.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import {
    buildOverrideNote,
    findOverlaps,
    IGNORED_STATUSES,
    shouldValidateOverlap,
    type OverlapReservation,
    type ReservationShape,
} from "./overlap";

export type OverlapConflict = {
    id: number;
    code: string | null;
    status: string | null;
    check_in: string;
    check_out: string;
    guest_name: string | null;
};

type Query = { room_id: number; check_in: string; check_out: string; exclude_id?: number | null };

/** Reservas que se solapan con la consulta (misma regla que el aviso del formulario). Lanza si la base falla. */
export async function findConflicts(q: Query): Promise<OverlapConflict[]> {
    const supabase = createClient();
    const base = (cols: string) => {
        let query = supabase
            .from("hostal_reservations")
            .select(cols)
            .eq("room_id", q.room_id)
            .eq("fulfillment_type", "INTERNAL")
            .lt("check_in", q.check_out)
            .gt("check_out", q.check_in)
            .not("status", "in", `(${IGNORED_STATUSES.join(",")})`);
        if (q.exclude_id) query = query.neq("id", q.exclude_id);
        return query;
    };

    const cols = "id, room_id, code, status, check_in, check_out, fulfillment_type, hostal_guests ( full_name )";
    let { data, error } = await base(`${cols}, hold_expires_at`);
    if (error && /hold_expires_at/i.test(error.message)) {
        // La columna aún no existe en esta base: se consulta sin ella.
        ({ data, error } = await base(cols));
    }
    if (error) throw new Error(error.message);

    const rows = ((data ?? []) as any[]).map((r) => ({
        ...r,
        hold_expires_at: r.hold_expires_at ?? null,
    })) as (OverlapReservation & { code: string | null; hostal_guests: any })[];

    return findOverlaps(rows, {
        room_id: q.room_id,
        check_in: q.check_in,
        check_out: q.check_out,
        exclude_id: q.exclude_id,
    }).map((r) => {
        const g = Array.isArray(r.hostal_guests) ? r.hostal_guests[0] : r.hostal_guests;
        return {
            id: r.id,
            code: r.code ?? null,
            status: r.status ?? null,
            check_in: String(r.check_in).slice(0, 10),
            check_out: String(r.check_out).slice(0, 10),
            guest_name: g?.full_name ?? null,
        };
    });
}

/** Fila guardada de una reserva (solo lo necesario para decidir si hay que validar). */
export async function fetchStoredReservation(
    id: number
): Promise<(ReservationShape & { id: number; notes: string | null; source: string | null }) | null> {
    const { data, error } = await createClient()
        .from("hostal_reservations")
        .select("id, room_id, fulfillment_type, status, check_in, check_out, notes, source")
        .eq("id", id)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as any) ?? null;
}

export type GuardResult = { response: NextResponse } | { notesLine: string | null };

/**
 * Aplica la validación antes de escribir.
 * - Si no hay que validar o no hay conflictos: { notesLine: null }.
 * - Si hay conflictos y allowOverlap === true con usuario superadmin (rol leído en el servidor):
 *   permite y devuelve la línea de autorización para agregar a las notas.
 * - Si no: 409 habitacion_ocupada con los conflictos (no se debe escribir nada).
 */
export async function guardOverlap(opts: {
    prev: ReservationShape | null;
    next: ReservationShape;
    excludeId?: number | null;
    allowOverlap?: boolean;
}): Promise<GuardResult> {
    if (!shouldValidateOverlap(opts.prev, opts.next)) return { notesLine: null };

    let conflicts: OverlapConflict[];
    try {
        conflicts = await findConflicts({
            room_id: Number(opts.next.room_id),
            check_in: String(opts.next.check_in).slice(0, 10),
            check_out: String(opts.next.check_out).slice(0, 10),
            exclude_id: opts.excludeId ?? null,
        });
    } catch (e) {
        console.error("Error verificando solapamiento:", e instanceof Error ? e.message : "desconocido");
        return {
            response: NextResponse.json(
                { ok: false, error: "No se pudo verificar la disponibilidad de la habitación" },
                { status: 500 }
            ),
        };
    }

    if (conflicts.length === 0) return { notesLine: null };

    if (opts.allowOverlap === true) {
        // El rol se lee en el servidor (sesión + hostal_users); no se confía en datos del cliente.
        const auth = await requireUser();
        if (auth.ok && auth.role === "superadmin") {
            return { notesLine: buildOverrideNote(auth.user.email ?? "superadmin") };
        }
    }

    return {
        response: NextResponse.json(
            { ok: false, error: "habitacion_ocupada", conflicts },
            { status: 409 }
        ),
    };
}
