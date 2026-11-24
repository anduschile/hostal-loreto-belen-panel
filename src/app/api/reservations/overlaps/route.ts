import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { findOverlaps, IGNORED_STATUSES, type OverlapReservation } from "@/lib/reservations/overlap";

export const dynamic = "force-dynamic";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

const QuerySchema = z
    .object({
        room_id: z.coerce.number().int().positive(),
        check_in: dateStr,
        check_out: dateStr,
        exclude_id: z.coerce.number().int().positive().optional(),
    })
    .refine((v) => v.check_out > v.check_in, {
        message: "check_out debe ser posterior a check_in",
        path: ["check_out"],
    });

// GET /api/reservations/overlaps?room_id=&check_in=&check_out=&exclude_id=
// Solo informa; no bloquea nada. Protegida por el middleware como el resto de /api.
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
        room_id: searchParams.get("room_id"),
        check_in: searchParams.get("check_in"),
        check_out: searchParams.get("check_out"),
        exclude_id: searchParams.get("exclude_id") || undefined,
    });

    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" },
            { status: 400 }
        );
    }

    const q = parsed.data;

    try {
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

        const conflicts = findOverlaps(rows, q).map((r) => {
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

        return NextResponse.json({ ok: true, data: conflicts });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
