// Referencia anónima del cliente para el límite por conexión de la base (p_client_ref).
// Nunca se envía la IP: solo los primeros 32 caracteres de SHA-256(IP + sal).

import { createHash } from "node:crypto";

export class MissingSaltError extends Error {
    constructor() {
        super("PUBLIC_API_HASH_SALT no está definida");
        this.name = "MissingSaltError";
    }
}

/** Primer valor de x-forwarded-for (o x-real-ip); "unknown" si no hay ninguno. */
export function getClientIp(headers: { get(name: string): string | null }): string {
    const xff = headers.get("x-forwarded-for");
    if (xff) {
        const first = xff.split(",")[0]?.trim();
        if (first) return first;
    }
    const real = headers.get("x-real-ip")?.trim();
    return real || "unknown";
}

export function computeClientRef(ip: string, salt: string): string {
    return createHash("sha256").update(`${ip}${salt}`).digest("hex").slice(0, 32);
}

/** Sal desde el entorno. En producción es obligatoria; en desarrollo hay una sal local. */
export function getSalt(env: { PUBLIC_API_HASH_SALT?: string; NODE_ENV?: string } = process.env): string {
    const salt = env.PUBLIC_API_HASH_SALT;
    if (salt) return salt;
    if (env.NODE_ENV === "production") throw new MissingSaltError();
    return "dev-only-salt";
}
