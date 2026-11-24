import { randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { jsonWithCors, preflightResponse } from "@/lib/public-api/cors";
import { computeClientRef, getClientIp, getSalt, MissingSaltError } from "@/lib/public-api/clientRef";
import { sendRequestEmails } from "@/lib/public-api/emails";
import { GENERIC_ERROR, mapDbError } from "@/lib/public-api/errors";
import { HOLD_HOURS, issueFields, ReservationRequestSchema } from "@/lib/public-api/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 8_000;

export async function OPTIONS(req: Request) {
    return preflightResponse(req.headers.get("origin"));
}

/** Respuesta falsa pero de apariencia normal para bots que completan el honeypot. */
function fakeCreated(body: Record<string, unknown>, origin: string | null) {
    const str = (v: unknown, fallback: string) => (typeof v === "string" && v.length <= 40 ? v : fallback);
    const code = `LB-${String(randomInt(0, 100000)).padStart(5, "0")}`;
    const hold = new Date(Date.now() + HOLD_HOURS * 3_600_000).toISOString();
    return jsonWithCors(
        {
            code,
            check_in: str(body.check_in, ""),
            check_out: str(body.check_out, ""),
            room_type: str(body.room_type, ""),
            hold_expires_at: hold,
        },
        201,
        origin
    );
}

// POST /api/public/reservation-requests
// Crea una solicitud provisoria (pending con vencimiento). La disponibilidad, la estadía
// máxima y los límites anti-spam los aplica la función SQL; aquí no se duplican.
export async function POST(req: Request) {
    const origin = req.headers.get("origin");

    let body: unknown;
    try {
        const raw = await req.text();
        if (raw.length > MAX_BODY_CHARS) return jsonWithCors({ error: "solicitud_muy_grande" }, 413, origin);
        body = JSON.parse(raw);
    } catch {
        return jsonWithCors({ error: "json_invalido" }, 400, origin);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return jsonWithCors({ error: "solicitud_invalida" }, 400, origin);
    }

    // Honeypot: sin llamar a la base ni enviar correos.
    const website = (body as Record<string, unknown>).website;
    if (typeof website === "string" && website.trim() !== "") {
        return fakeCreated(body as Record<string, unknown>, origin);
    }

    const parsed = ReservationRequestSchema.safeParse(body);
    if (!parsed.success) {
        return jsonWithCors({ error: "solicitud_invalida", fields: issueFields(parsed.error) }, 400, origin);
    }
    const d = parsed.data;

    let clientRef: string;
    try {
        clientRef = computeClientRef(getClientIp(req.headers), getSalt());
    } catch (e) {
        if (e instanceof MissingSaltError) {
            console.error("[public-api] Falta configurar PUBLIC_API_HASH_SALT en producción; la API pública está deshabilitada.");
        } else {
            console.error("[public-api] No se pudo calcular la referencia del cliente.");
        }
        return jsonWithCors({ error: GENERIC_ERROR.error }, GENERIC_ERROR.status, origin);
    }

    try {
        const { data, error } = await createClient().rpc("hostal_public_create_request", {
            p_check_in: d.check_in,
            p_check_out: d.check_out,
            p_room_type: d.room_type,
            p_adults: d.adults,
            p_children: d.children,
            p_full_name: d.full_name,
            p_email: d.email,
            p_phone: d.phone || null,
            p_notes: d.notes || null,
            p_client_ref: clientRef,
            p_hold_hours: HOLD_HOURS,
        });

        if (error) {
            const mapped = mapDbError(error.message);
            console.error(`[public-api] reservation-requests: ${mapped.error} (${error.code ?? "sin código"}) ${error.message}`);
            return jsonWithCors({ error: mapped.error }, mapped.status, origin);
        }

        const row = (Array.isArray(data) ? data[0] : data) as
            | { out_reservation_id: number; out_code: string; out_hold_expires_at: string }
            | null
            | undefined;
        if (!row?.out_code) {
            console.error("[public-api] reservation-requests: la base no devolvió la solicitud creada.");
            return jsonWithCors({ error: GENERIC_ERROR.error }, GENERIC_ERROR.status, origin);
        }

        const holdIso = new Date(row.out_hold_expires_at).toISOString();

        // Los correos nunca hacen fallar la solicitud (sendRequestEmails no lanza).
        await sendRequestEmails({
            code: row.out_code,
            check_in: d.check_in,
            check_out: d.check_out,
            room_type: d.room_type,
            adults: d.adults,
            children: d.children,
            full_name: d.full_name,
            email: d.email,
            phone: d.phone || null,
            notes: d.notes || null,
            hold_expires_at: holdIso,
        });

        return jsonWithCors(
            {
                code: row.out_code,
                check_in: d.check_in,
                check_out: d.check_out,
                room_type: d.room_type,
                hold_expires_at: holdIso,
            },
            201,
            origin
        );
    } catch (e) {
        console.error("[public-api] reservation-requests: error inesperado", e instanceof Error ? e.message : "desconocido");
        return jsonWithCors({ error: GENERIC_ERROR.error }, GENERIC_ERROR.status, origin);
    }
}
