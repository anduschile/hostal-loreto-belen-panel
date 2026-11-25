// CORS de la API pública.
//
// IMPORTANTE: CORS NO es una medida de seguridad por sí sola. Solo le dice al navegador
// qué sitios pueden leer la respuesta; cualquier cliente que no sea un navegador (curl,
// scripts, bots) lo ignora. La protección real son las validaciones de entrada y los
// límites anti-spam y de disponibilidad que viven en la base de datos.

export const DEFAULT_ALLOWED_ORIGINS = [
    "https://loretobelen.cl",
    "https://www.loretobelen.cl",
    "https://demo.loretobelen.cl",
    "https://nuevo.loretobelen.cl",
];

/**
 * Patrones de previews de Vercel del proyecto loretobelen-web. Se aplican SIEMPRE (también si
 * PUBLIC_API_ALLOWED_ORIGINS define la lista exacta). Solo https, host completo anclado y un
 * único segmento de subdominio [a-z0-9-], sin puntos: no admiten otros dominios.
 */
export const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
    /^https:\/\/loretobelen-web-[a-z0-9-]+\.vercel\.app$/,
    /^https:\/\/loretobelen-[a-z0-9-]+-joseurraira-9244s-projects\.vercel\.app$/,
];

/** True si el origen está en la lista exacta o coincide con un patrón permitido. */
export function isOriginAllowed(origin: string | null | undefined, allowed: string[]): boolean {
    if (!origin) return false;
    return allowed.includes(origin) || ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

const DEV_ORIGIN = "http://localhost:5173";

/** Lista de orígenes permitidos: PUBLIC_API_ALLOWED_ORIGINS (coma) o la lista por defecto. */
export function getAllowedOrigins(envValue: string | undefined, isProduction: boolean): string[] {
    const fromEnv = (envValue ?? "")
        .split(",")
        .map((s) => s.trim().replace(/\/+$/, ""))
        .filter(Boolean);
    const list = fromEnv.length > 0 ? fromEnv : [...DEFAULT_ALLOWED_ORIGINS];
    if (!isProduction && !list.includes(DEV_ORIGIN)) list.push(DEV_ORIGIN);
    return list;
}

/** Encabezados CORS: el origen exacto solo si está en la lista. */
export function corsHeaders(origin: string | null | undefined, allowed: string[]): Record<string, string> {
    const headers: Record<string, string> = { Vary: "Origin" };
    if (origin && isOriginAllowed(origin, allowed)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Content-Type";
        headers["Access-Control-Max-Age"] = "86400";
    }
    return headers;
}

/** Encabezados CORS según el entorno actual. */
export function corsHeadersFromEnv(origin: string | null | undefined): Record<string, string> {
    const allowed = getAllowedOrigins(
        process.env.PUBLIC_API_ALLOWED_ORIGINS,
        process.env.NODE_ENV === "production"
    );
    return corsHeaders(origin, allowed);
}

/** Respuesta al preflight OPTIONS: 204; sin permisos CORS si el origen no está permitido. */
export function preflightResponse(origin: string | null | undefined): Response {
    return new Response(null, { status: 204, headers: corsHeadersFromEnv(origin) });
}

/** Respuesta JSON con encabezados CORS y sin caché. */
export function jsonWithCors(body: unknown, status: number, origin: string | null | undefined): Response {
    return Response.json(body, {
        status,
        headers: { ...corsHeadersFromEnv(origin), "Cache-Control": "no-store" },
    });
}
