import { createClient } from "@/lib/supabase/server";
import { jsonWithCors, preflightResponse } from "@/lib/public-api/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;

export async function OPTIONS(req: Request) {
    return preflightResponse(req.headers.get("origin"));
}

// GET /api/public/health
// Salud para monitoreo externo: una lectura mínima (1 fila de hostal_rooms, solo id).
// Sin parámetros, sin efectos y sin datos en la respuesta: solo { ok: true | false }.
export async function GET(req: Request) {
    const origin = req.headers.get("origin");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const query = Promise.resolve(createClient().from("hostal_rooms").select("id").limit(1));
        // Si el plazo gana la carrera y la consulta falla después, evita un unhandled rejection.
        // Rama aparte: la carrera sigue viendo el rechazo original, así que la respuesta no cambia.
        query.catch(() => {});
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
        });
        const { error } = await Promise.race([query, timeout]);
        if (error) {
            console.error(`[public-api] health: fallo de base (${error.code ?? "sin código"})`);
            return jsonWithCors({ ok: false }, 503, origin);
        }
        return jsonWithCors({ ok: true }, 200, origin);
    } catch (e) {
        console.error("[public-api] health: error", e instanceof Error ? e.message : "desconocido");
        return jsonWithCors({ ok: false }, 503, origin);
    } finally {
        if (timer) clearTimeout(timer);
    }
}
