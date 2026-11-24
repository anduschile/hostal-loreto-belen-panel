// Verificación de Cloudflare Turnstile (anti-bots) para la API pública.
// El secreto vive solo en la variable de entorno TURNSTILE_SECRET_KEY: nunca se imprime ni se registra.

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_TIMEOUT_MS = 5_000;

export type TurnstileResult =
    | { status: "ok" }
    | { status: "rechazado"; errorCodes: string[] }
    | { status: "no_disponible" };

/** Secreto desde el entorno; undefined si no está definido o está vacío. */
export function getTurnstileSecret(env: Record<string, string | undefined> = process.env): string | undefined {
    const s = env.TURNSTILE_SECRET_KEY?.trim();
    return s ? s : undefined;
}

/**
 * Valida el token contra Cloudflare. Devuelve ok, rechazado (con error-codes) o
 * no_disponible (red, timeout, HTTP no 2xx o respuesta ilegible).
 */
export async function verifyTurnstile(token: string, remoteIp: string): Promise<TurnstileResult> {
    const secret = getTurnstileSecret();
    if (!secret) return { status: "no_disponible" };

    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (remoteIp && remoteIp !== "unknown") form.set("remoteip", remoteIp);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);
    try {
        const res = await fetch(TURNSTILE_VERIFY_URL, {
            method: "POST",
            body: form,
            signal: controller.signal,
            cache: "no-store",
        });
        if (!res.ok) return { status: "no_disponible" };
        const json = (await res.json()) as { success?: boolean; "error-codes"?: unknown };
        if (json.success === true) return { status: "ok" };
        const codes = Array.isArray(json["error-codes"]) ? json["error-codes"].filter((c): c is string => typeof c === "string") : [];
        return { status: "rechazado", errorCodes: codes };
    } catch {
        return { status: "no_disponible" };
    } finally {
        clearTimeout(timer);
    }
}
