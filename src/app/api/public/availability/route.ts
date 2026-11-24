import { createClient } from "@/lib/supabase/server";
import { jsonWithCors, preflightResponse } from "@/lib/public-api/cors";
import { mapDbError } from "@/lib/public-api/errors";
import { AvailabilityQuerySchema, issueFields, nightsBetween } from "@/lib/public-api/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
    return preflightResponse(req.headers.get("origin"));
}

// GET /api/public/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD
// Solo informa si hay disponibilidad (boolean) y la capacidad máxima por tipo.
// No expone cantidad de habitaciones libres, ids, reservas ni huéspedes.
export async function GET(req: Request) {
    const origin = req.headers.get("origin");
    const { searchParams } = new URL(req.url);

    const parsed = AvailabilityQuerySchema.safeParse({
        check_in: searchParams.get("check_in") ?? undefined,
        check_out: searchParams.get("check_out") ?? undefined,
        // Cualquier otro parámetro se rechaza (modo estricto).
        ...Object.fromEntries(
            [...searchParams.entries()].filter(([k]) => k !== "check_in" && k !== "check_out")
        ),
    });
    if (!parsed.success) {
        return jsonWithCors({ error: "solicitud_invalida", fields: issueFields(parsed.error) }, 400, origin);
    }
    const { check_in, check_out } = parsed.data;

    try {
        const { data, error } = await createClient().rpc("hostal_public_availability", {
            p_check_in: check_in,
            p_check_out: check_out,
        });

        if (error) {
            const mapped = mapDbError(error.message);
            console.error(`[public-api] availability: ${mapped.error} (${error.code ?? "sin código"}) ${error.message}`);
            return jsonWithCors({ error: mapped.error }, mapped.status, origin);
        }

        const rows = (data ?? []) as { room_type: string; rooms_available: number; max_adults: number }[];
        const types = rows.map((r) => ({
            type: r.room_type,
            available: Number(r.rooms_available) > 0,
            max_guests: Number(r.max_adults),
        }));

        return jsonWithCors(
            { check_in, check_out, nights: nightsBetween(check_in, check_out), types },
            200,
            origin
        );
    } catch (e) {
        console.error("[public-api] availability: error inesperado", e instanceof Error ? e.message : "desconocido");
        return jsonWithCors({ error: "error_interno" }, 500, origin);
    }
}
