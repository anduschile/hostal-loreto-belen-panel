import { NextResponse } from "next/server";
import { z } from "zod";
import { findConflicts } from "@/lib/reservations/overlapGuard";

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
// Consulta en vivo para el formulario. La validación que bloquea se hace al guardar
// (POST/PUT /api/reservations y PATCH /api/reservations/[id]/status). Protegida por el middleware.
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

    try {
        const conflicts = await findConflicts(parsed.data);
        return NextResponse.json({ ok: true, data: conflicts });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
