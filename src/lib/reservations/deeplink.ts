// Enlace directo a una solicitud web pendiente (?codigo=<code>), usado por el correo a recepción.
// Solo se considera válido si la reserva existe, es web y sigue pendiente: en cualquier otro caso
// la página se comporta como si no hubiera parámetro (sin error ni resaltado).

import { isIsoDay } from "./range";

export type DeepLinkTarget = { code: string; check_in: string; check_out: string; status: string | null; source: string | null };

const day = (v: string | null | undefined) => String(v ?? "").slice(0, 10);

/** Normaliza el parámetro de URL: vacío, múltiple o de largo excesivo => null. */
export function parseCodigoParam(v: string | string[] | undefined): string | null {
    const raw = Array.isArray(v) ? v[0] : v;
    const code = String(raw ?? "").trim();
    return code && code.length <= 64 ? code : null;
}

export function isPendingWebRequest(r: { status?: string | null; source?: string | null } | null | undefined): boolean {
    return !!r && r.status === "pending" && r.source === "web";
}

/**
 * Rango a mostrar. Si hay un destino válido y la URL no trae un rango propio (from/to), se usa la
 * estadía de la reserva para que aparezca en la lista aunque no sea de hoy. Si no, se deja el rango dado.
 */
export function rangeForDeepLink(
    target: DeepLinkTarget | null,
    urlFrom: string | undefined,
    urlTo: string | undefined,
    fallback: { from: string; to: string }
): { from: string; to: string; highlightCode: string | null } {
    if (!target || !isPendingWebRequest(target)) return { ...fallback, highlightCode: null };
    if (isIsoDay(urlFrom) && isIsoDay(urlTo)) return { ...fallback, highlightCode: target.code };
    const ci = day(target.check_in);
    const co = day(target.check_out);
    if (!isIsoDay(ci) || !isIsoDay(co)) return { ...fallback, highlightCode: target.code };
    return { from: ci, to: co, highlightCode: target.code };
}
