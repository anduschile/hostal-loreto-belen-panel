// Atajos para elegir fechas en el formulario de cotizaciones.
// Todo se calcula con números (año, mes, día) y el texto AAAA-MM-DD se arma a mano:
// no se usa Date con strings ni toISOString, así ninguna fecha se corre de día por la zona horaria.

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

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

export type MonthShortcut = { label: string; from: string; to: string };

/** Los próximos `count` meses desde el de `today` (el primero parte hoy; los demás, el día 1). */
export function monthShortcuts(today: string, count = 6): MonthShortcut[] {
    const p = parseIso(today);
    if (!p) return [];
    return Array.from({ length: count }, (_, k) => {
        const t = addMonths(p.y, p.m, k);
        return {
            label: `${MONTHS_SHORT[t.m - 1]} ${t.y}`,
            from: k === 0 ? today : makeIso(t.y, t.m, 1),
            to: makeIso(t.y, t.m, daysInMonth(t.y, t.m)),
        };
    });
}

/** «Extender hasta»: fin del mes de Desde, del mes siguiente y del subsiguiente. [] si Desde no es válida. */
export function extendTargets(from?: string | null): string[] {
    if (!parseIso(from)) return [];
    return [0, 1, 2].map((k) => lastDayOfMonth(from, k));
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
