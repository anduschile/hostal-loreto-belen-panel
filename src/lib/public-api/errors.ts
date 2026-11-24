// Mapeo de errores de la base a respuestas HTTP. Nunca se devuelve el mensaje crudo.

export type PublicApiError = { status: number; error: string };

const KNOWN: { token: string; status: number; error: string }[] = [
    { token: "NO_DISPONIBLE", status: 409, error: "no_disponible" },
    { token: "FECHAS_INVALIDAS", status: 400, error: "fechas_invalidas" },
    { token: "ESTADIA_MUY_LARGA", status: 400, error: "estadia_muy_larga" },
    { token: "TIPO_INVALIDO", status: 400, error: "tipo_invalido" },
    { token: "DATOS_INVALIDOS", status: 400, error: "datos_invalidos" },
    { token: "DEMASIADAS_SOLICITUDES", status: 429, error: "demasiadas_solicitudes" },
];

export const GENERIC_ERROR: PublicApiError = { status: 500, error: "error_interno" };

/** Traduce el mensaje de un error de la base (RAISE EXCEPTION) a estado y código cortos. */
export function mapDbError(message: string | null | undefined): PublicApiError {
    const msg = String(message ?? "");
    for (const k of KNOWN) {
        if (msg.includes(k.token)) return { status: k.status, error: k.error };
    }
    return GENERIC_ERROR;
}
