// Semántica de solapamiento de estadía con un rango [from, to] (fechas YYYY-MM-DD, ambos extremos incluidos):
// check_in <= to && check_out >= from. Se usa igual en el servidor (consulta) y en la interfaz.

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
    return ci <= to && co >= from;
}
