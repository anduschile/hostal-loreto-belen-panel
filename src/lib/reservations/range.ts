// Semántica de estadía dentro de un rango [from, to] (fechas YYYY-MM-DD). Se usa igual en el servidor
// (consulta) y en la interfaz:
// - from < to (varios días): al menos una noche dentro del rango => check_in <= to && check_out > from
//   (quien sale el primer día ya no pasa ninguna noche en el rango y queda fuera).
// - from = to (un solo día): llegadas, estadías en curso y salidas de ese día => check_in <= to && check_out >= from.

/** true si el check_out debe compararse de forma estricta (> from) para este rango. */
export function checkoutIsStrict(from: string, to: string): boolean {
    return from < to;
}

const day = (v: string | null | undefined) => String(v ?? "").slice(0, 10);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(v: string | null | undefined): v is string {
    return typeof v === "string" && ISO_DAY.test(v);
}

export function stayOverlapsRange(
    checkIn: string | null | undefined,
    checkOut: string | null | undefined,
    from: string,
    to: string
): boolean {
    const ci = day(checkIn);
    const co = day(checkOut);
    if (!isIsoDay(ci) || !isIsoDay(co) || !isIsoDay(from) || !isIsoDay(to)) return false;
    return ci <= to && (checkoutIsStrict(from, to) ? co > from : co >= from);
}
