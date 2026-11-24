// Atajos para elegir fechas en el formulario de cotizaciones.
// Todo se calcula con números (año, mes, día) y el texto AAAA-MM-DD se arma a mano:
// no se usa Date con strings ni toISOString, así ninguna fecha se corre de día por la zona horaria.

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function isLeapYear(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Días del mes (m = 1..12). */
export function daysInMonth(y: number, m: number): number {
    if (m === 2) return isLeapYear(y) ? 29 : 28;
    return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

export function makeIso(y: number, m: number, d: number): string {
    return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** «2027-02-10» -> {y, m, d}; null si no es una fecha AAAA-MM-DD válida. */
export function parseIso(iso?: string | null): { y: number; m: number; d: number } | null {
    const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
    if (!r) return null;
    const y = Number(r[1]), m = Number(r[2]), d = Number(r[3]);
    if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
    return { y, m, d };
}

/** Suma `k` meses al par (año, mes). */
function addMonths(y: number, m: number, k: number): { y: number; m: number } {
    const idx = y * 12 + (m - 1) + k;
    return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

/** Primer día del mes de la fecha. "" si la fecha no es válida. */
export function firstDayOfMonth(iso?: string | null): string {
    const p = parseIso(iso);
    return p ? makeIso(p.y, p.m, 1) : "";
}

/** Último día del mes de la fecha, sumando `monthsAhead` meses (0 = su propio mes). "" si la fecha no es válida. */
export function lastDayOfMonth(iso?: string | null, monthsAhead = 0): string {
    const p = parseIso(iso);
    if (!p) return "";
    const t = addMonths(p.y, p.m, monthsAhead);
    return makeIso(t.y, t.m, daysInMonth(t.y, t.m));
}

/** Día siguiente (con cambio de mes y de año). "" si la fecha no es válida. */
export function nextDay(iso?: string | null): string {
    const p = parseIso(iso);
    if (!p) return "";
    if (p.d < daysInMonth(p.y, p.m)) return makeIso(p.y, p.m, p.d + 1);
    const t = addMonths(p.y, p.m, 1);
    return makeIso(t.y, t.m, 1);
}

/** Fecha de hoy del navegador como AAAA-MM-DD (con la fecha local, sin pasar por UTC). */
export function todayIso(now: Date = new Date()): string {
    return makeIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Al cambiar «Desde» (modo Recurrente): si «Hasta» falta o quedó antes, pasa al último día del mes de Desde. */
export function endAfterFromChange(from: string, to: string): string {
    if (!parseIso(from)) return to;
    return !parseIso(to) || to < from ? lastDayOfMonth(from) : to;
}

/** Al cambiar «Entrada» (modo Rango): si «Salida» falta o no es posterior, pasa al día siguiente (1 noche). */
export function exitAfterEntryChange(entry: string, exit: string): string {
    if (!parseIso(entry)) return exit;
    return !parseIso(exit) || exit <= entry ? nextDay(entry) : exit;
}

// ---- Calendario de rango (dos meses) ----

const MONTHS_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** «Enero de 2027». */
export function monthTitle(y: number, m: number): string {
    return `${MONTHS_FULL[m - 1]} de ${y}`;
}

/** Mes (1..12) desplazado `k` meses. Sirve para las flechas ‹ › y para el segundo mes visible. */
export function shiftMonth(y: number, m: number, k: number): { y: number; m: number } {
    return addMonths(y, m, k);
}

/** Día de la semana (0 = domingo ... 6 = sábado), con números (algoritmo de Sakamoto). */
export function weekdayOfYmd(y: number, m: number, d: number): number {
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    const yy = m < 3 ? y - 1 : y;
    return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

/** Cuadrícula de un mes con semana que parte en lunes: celdas vacías (null) al inicio y luego los días 1..N. */
export function monthGrid(y: number, m: number): (number | null)[] {
    const lead = (weekdayOfYmd(y, m, 1) + 6) % 7; // lunes = 0
    return [...Array<null>(lead).fill(null), ...Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1)];
}

export type RangeMode = "rango" | "recurrente";

/**
 * Qué pasa con cada clic del calendario de rango.
 *  - sin inicio, o con inicio y fin ya elegidos (tercer clic): el día pasa a ser el nuevo inicio y el fin se limpia.
 *  - solo inicio: el día es el fin si es posterior al inicio. Si es el mismo día o anterior, pasa a ser el nuevo inicio,
 *    salvo en modo Recurrente, donde «Hasta» puede ser igual a «Desde».
 */
export function nextRangeSelection(start: string, end: string, clicked: string, mode: RangeMode): { start: string; end: string } {
    if (!start || end) return { start: clicked, end: "" };
    if (clicked > start) return { start, end: clicked };
    if (clicked === start && mode === "recurrente") return { start, end: clicked };
    return { start: clicked, end: "" };
}
