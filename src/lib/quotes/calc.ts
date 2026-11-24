// Cálculo de cotizaciones. Función PURA y sin dependencias: pensada para que
// el panel, el PDF y (más adelante) el sitio público llamen exactamente lo mismo.

export const IVA_RATE = 0.19;

export const OCCUPANCIES = ["single", "doble", "triple", "cuadruple"] as const;
export type Occupancy = (typeof OCCUPANCIES)[number];

export const OCCUPANCY_LABELS: Record<Occupancy, string> = {
    single: "Single",
    doble: "Doble",
    triple: "Triple",
    cuadruple: "Cuádruple",
};

export type DiscountType = "porcentaje" | "monto_fijo" | "ninguno";

/** Tarifa neta por noche según ocupación (0 = sin cargar). */
export type RateTable = Record<Occupancy, number>;

export type QuoteLineInput = {
    occupancy: Occupancy;
    rooms: number;
    /** Noches de la línea. Si viene `dates`, las noches son dates.length y este valor se ignora. */
    nights: number;
    /** Una fecha ISO por noche (la noche es la fecha de llegada). Opcional: cotizaciones antiguas no la tienen. */
    dates?: string[] | null;
    /** Tarifa escrita a mano. Si es > 0 pisa la de la tabla. */
    rate_override?: number | null;
    /**
     * Tarifa CON IVA por noche, tal como la ingresó el usuario (entero). Si viene, el total con IVA de la línea es
     * exactamente rate_with_iva × habitaciones × noches y el neto se deriva de ahí (sin redondear la tarifa neta).
     * Opcional: las cotizaciones antiguas no la tienen y se calculan igual que siempre.
     */
    rate_with_iva?: number | null;
};

export type QuoteLineResult = {
    occupancy: Occupancy;
    rooms: number;
    nights: number;
    rate: number; // tarifa neta/noche efectivamente usada (línea «con IVA»: neto redondeado, solo informativo)
    rate_with_iva?: number; // solo si la línea se ingresó con IVA
    rate_missing: boolean; // true si la tarifa efectiva es 0 («tarifa sin cargar»)
    subtotal: number; // rate * rooms * nights
};

export type QuoteCalcInput = {
    lines: QuoteLineInput[];
    rates: RateTable;
    discount_type?: DiscountType | string | null;
    discount_value?: number | null;
};

export type QuoteCalcResult = {
    lines: QuoteLineResult[];
    gross: number; // suma de líneas antes de descuento
    discount: number;
    net: number; // gross - discount
    iva: number; // 19% sobre el neto, se SUMA
    total: number; // net + iva
    has_missing_rates: boolean;
};

const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
};

export type RateInputMode = "con_iva" | "neto";

/** Valor ingresado -> neto a guardar (net_rate). Con IVA: round(valor / 1.19). */
export function toNetRate(value: number, mode: RateInputMode): number {
    const v = num(value);
    return mode === "con_iva" ? Math.round(v / (1 + IVA_RATE)) : Math.round(v);
}

/** Neto -> valor con IVA incluido (redondeado). */
export function withIva(net: number): number {
    return Math.round(num(net) * (1 + IVA_RATE));
}

export function emptyRates(): RateTable {
    return { single: 0, doble: 0, triple: 0, cuadruple: 0 };
}

/** Tarifa efectiva de una línea: la manual (>0) o la de la tabla. */
export function resolveRate(rates: RateTable, occupancy: Occupancy, override?: number | null): number {
    const o = num(override);
    if (o > 0) return o;
    return num(rates[occupancy]);
}

/** Valor nulo o desconocido -> «ninguno». Los valores válidos coinciden con el CHECK de hostal_quotes. */
export function normalizeDiscountType(v: unknown): DiscountType {
    return v === "porcentaje" || v === "monto_fijo" ? v : "ninguno";
}

/** Texto del descuento para PDF/pantalla: «Descuento convenio 25%» o «Descuento convenio $50.000». */
export function discountLabel(type?: unknown, value?: number | null, label?: string | null): string {
    const t = normalizeDiscountType(type);
    const v = num(value);
    // Sin etiqueta guardada (cotizaciones antiguas): venían del convenio de la empresa.
    const base = label?.trim() || "Descuento convenio";
    if (t === "porcentaje" && v > 0) return `${base} ${Number.isInteger(v) ? v : String(v).replace(".", ",")}%`;
    if (t === "monto_fijo" && v > 0) return `${base} $${Math.round(v).toLocaleString("es-CL")}`;
    return "Descuento";
}

export type DiscountMode = "ninguno" | "empresa" | "manual";
export const COMPANY_DISCOUNT_LABEL = "Descuento convenio";
export const MANUAL_DISCOUNT_LABEL = "Descuento";

export function calculateDiscount(gross: number, rawType?: unknown, value?: number | null): number {
    const type = normalizeDiscountType(rawType);
    const v = num(value);
    if (type === "ninguno" || v <= 0 || gross <= 0) return 0;
    if (type === "porcentaje") return Math.round((gross * Math.min(v, 100)) / 100);
    return Math.min(Math.round(v), gross); // monto_fijo: nunca más que el bruto
}

/**
 * Valor «con IVA» entero que corresponde a una tarifa neta guardada como entero (la tabla de tarifas guarda
 * round(valor/1.19)). Entre los enteros que dan ese neto se elige el más «redondo» (múltiplo de la mayor potencia de 10)
 * y, a igualdad, el más cercano a neto×1,19. Ej.: 50420 -> 60000.
 */
export function ivaRateFromNet(net: number): number {
    const n = Math.round(num(net));
    if (n <= 0) return 0;
    const exact = n * (1 + IVA_RATE);
    const cands: number[] = [];
    for (let v = Math.floor(exact) - 2; v <= Math.ceil(exact) + 2; v++) if (Math.round(v / (1 + IVA_RATE)) === n) cands.push(v);
    if (!cands.length) return Math.round(exact);
    const roundness = (v: number) => { let p = 1; while (p < 1e6 && v % (p * 10) === 0) p *= 10; return p; };
    cands.sort((a, b) => roundness(b) - roundness(a) || Math.abs(a - exact) - Math.abs(b - exact));
    return cands[0];
}

/**
 * Líneas sin tarifa propia usan la tabla de tarifas: se interpretan como valores CON IVA (así se cargan por defecto)
 * y se pasan a rate_with_iva. Las que ya traen tarifa (neta o con IVA) quedan como están.
 */
export function withTableIva<T extends { occupancy: Occupancy; rate_override?: number | null; rate_with_iva?: number | null }>(lines: T[], rates: RateTable): T[] {
    return lines.map((l) => {
        if (num(l.rate_with_iva) > 0 || num(l.rate_override) > 0) return l;
        const v = ivaRateFromNet(rates[l.occupancy]);
        return v > 0 ? { ...l, rate_with_iva: v } : l;
    });
}

/**
 * Cálculo con tarifas CON IVA: el total con IVA sale del valor ingresado (exacto) y neto e IVA se derivan de él.
 * Los subtotales por línea (netos enteros) suman exactamente el bruto (reparto por mayor resto).
 */
function calculateQuoteWithIva(input: QuoteCalcInput): QuoteCalcResult {
    const k = 1 + IVA_RATE;
    const base = input.lines.map((l) => {
        const rooms = Math.floor(num(l.rooms));
        const nights = Array.isArray(l.dates) && l.dates.length > 0 ? l.dates.length : Math.floor(num(l.nights));
        const gv = Math.round(num(l.rate_with_iva));
        const iva = gv > 0;
        const rate = iva ? Math.round(gv / k) : resolveRate(input.rates, l.occupancy, l.rate_override);
        const exact = iva ? (gv * rooms * nights) / k : rate * rooms * nights;
        return { l, rooms, nights, rate, iva, gv, exact };
    });
    const grossExact = base.reduce((s, b) => s + b.exact, 0);
    const gross = Math.round(grossExact);
    const floors = base.map((b) => Math.floor(b.exact + 1e-9));
    let left = gross - floors.reduce((s, f) => s + f, 0);
    const order = base.map((b, i) => ({ i, frac: b.exact - floors[i] })).sort((a, b) => b.frac - a.frac);
    for (const o of order) { if (left <= 0) break; floors[o.i] += 1; left -= 1; }
    const lines: QuoteLineResult[] = base.map((b, i) => ({
        occupancy: b.l.occupancy, rooms: b.rooms, nights: b.nights, rate: b.rate, rate_missing: b.rate === 0,
        subtotal: floors[i], ...(b.iva ? { rate_with_iva: b.gv } : {}),
    }));
    const type = normalizeDiscountType(input.discount_type);
    const dv = num(input.discount_value);
    let discount = 0, discountExact = 0;
    if (type !== "ninguno" && dv > 0 && gross > 0) {
        if (type === "porcentaje") { discountExact = (grossExact * Math.min(dv, 100)) / 100; discount = Math.min(Math.round(discountExact), gross); }
        else { discount = Math.min(Math.round(dv), gross); discountExact = discount; }
    }
    const net = gross - discount;
    const total = Math.round((grossExact - discountExact) * k);
    return { lines, gross, discount, net, iva: total - net, total, has_missing_rates: lines.some((l) => l.rate_missing) };
}

export function calculateQuote(input: QuoteCalcInput): QuoteCalcResult {
    if (input.lines.some((l) => num(l.rate_with_iva) > 0)) return calculateQuoteWithIva(input);
    const lines: QuoteLineResult[] = input.lines.map((l) => {
        const rooms = Math.floor(num(l.rooms));
        const nights = Array.isArray(l.dates) && l.dates.length > 0 ? l.dates.length : Math.floor(num(l.nights));
        const rate = resolveRate(input.rates, l.occupancy, l.rate_override);
        return {
            occupancy: l.occupancy,
            rooms,
            nights,
            rate,
            rate_missing: rate === 0,
            subtotal: Math.round(rate * rooms * nights),
        };
    });

    const gross = lines.reduce((s, l) => s + l.subtotal, 0);
    const discount = calculateDiscount(gross, input.discount_type, input.discount_value);
    const net = gross - discount;
    const iva = Math.round(net * IVA_RATE);

    return {
        lines,
        gross,
        discount,
        net,
        iva,
        total: net + iva,
        has_missing_rates: lines.some((l) => l.rate_missing),
    };
}

/** Noches entre dos fechas ISO (YYYY-MM-DD). 0 si el rango no es válido. */
export function nightsBetween(start?: string | null, end?: string | null): number {
    if (!start || !end) return 0;
    const a = Date.parse(start + "T00:00:00Z");
    const b = Date.parse(end + "T00:00:00Z");
    if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
    return Math.round((b - a) / 86400000);
}

// ---------------------------------------------------------------------------
// Fechas por línea (una fecha ISO por noche; la noche es la fecha de llegada)
// ---------------------------------------------------------------------------

export const MAX_NIGHTS_PER_LINE = 366;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;
const toMs = (iso: string) => Date.parse(iso + "T00:00:00Z");
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function isValidIsoDate(s: unknown): s is string {
    if (typeof s !== "string" || !ISO_RE.test(s)) return false;
    const ms = toMs(s);
    if (Number.isNaN(ms) || fromMs(ms) !== s) return false; // rechaza 2026-02-31
    const y = Number(s.slice(0, 4));
    return y >= 2000 && y <= 2100;
}

/** Error de validación (texto) o null si el arreglo de fechas es válido. */
export function validateDates(dates: unknown): string | null {
    if (!Array.isArray(dates) || dates.length === 0) return "Cada línea necesita al menos una noche.";
    if (dates.length > MAX_NIGHTS_PER_LINE) return `Una línea no puede tener más de ${MAX_NIGHTS_PER_LINE} noches.`;
    for (const d of dates) if (!isValidIsoDate(d)) return `Fecha no válida: ${String(d)}.`;
    if (new Set(dates).size !== dates.length) return "Hay fechas repetidas en una línea.";
    return null;
}

export const sortDates = (dates: string[]) => [...dates].sort();

/** Una noche por cada fecha de [start, end): llegada start, salida end. */
export function rangeDates(start?: string | null, end?: string | null): string[] {
    const n = nightsBetween(start, end);
    if (n <= 0 || n > MAX_NIGHTS_PER_LINE) return [];
    const a = toMs(start as string);
    return Array.from({ length: n }, (_, i) => fromMs(a + i * DAY_MS));
}

/** Día de la semana de una fecha ISO: 0 = domingo ... 6 = sábado. */
export const weekdayOf = (iso: string) => new Date(toMs(iso)).getUTCDay();

/** Fechas entre `from` y `to` (ambas incluidas) cuyo día de semana esté en `weekdays` (0 = domingo). */
export function recurringDates(from?: string | null, to?: string | null, weekdays: number[] = []): string[] {
    if (!isValidIsoDate(from) || !isValidIsoDate(to) || toMs(to) < toMs(from) || weekdays.length === 0) return [];
    const set = new Set(weekdays);
    const out: string[] = [];
    for (let ms = toMs(from); ms <= toMs(to); ms += DAY_MS) {
        if (set.has(new Date(ms).getUTCDay())) out.push(fromMs(ms));
        if (out.length > MAX_NIGHTS_PER_LINE) break;
    }
    return out;
}

/** Fechas efectivas de una línea: las propias o, si es antigua, las del rango de la cotización. */
export function effectiveDates(line: { dates?: string[] | null }, checkIn?: string | null, checkOut?: string | null): string[] {
    return Array.isArray(line.dates) && line.dates.length > 0 ? sortDates(line.dates) : rangeDates(checkIn, checkOut);
}

/** Período de la cotización: check_in = fecha mínima, check_out = fecha máxima + 1 día. */
export function periodFromDates(allDates: string[]): { check_in: string; check_out: string } | null {
    if (allDates.length === 0) return null;
    const s = sortDates(allDates);
    return { check_in: s[0], check_out: addDays(s[s.length - 1], 1) };
}

/** true si todas las líneas tienen exactamente las mismas noches. */
export function linesShareDates(lines: { dates?: string[] | null }[], checkIn?: string | null, checkOut?: string | null): boolean {
    const keys = lines.map((l) => effectiveDates(l, checkIn, checkOut).join(","));
    return keys.every((k) => k === keys[0]);
}

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const WEEK_ORDER = [0, 1, 2, 3, 4, 5, 6]; // domingo primero

const parts = (iso: string) => ({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1, d: Number(iso.slice(8, 10)) });

/** «6 de diciembre» (o «6 de diciembre de 2026» con withYear). */
export function formatDayLong(iso: string, withYear = false): string {
    const p = parts(iso);
    return `${p.d} de ${MONTHS_ES[p.m]}${withYear ? ` de ${p.y}` : ""}`;
}

/** «del 6 al 28 de diciembre» / «del 28 de noviembre al 3 de diciembre» (con año si cruza de año). */
export function formatRangeText(a: string, b: string): string {
    const pa = parts(a), pb = parts(b);
    if (a === b) return `el ${formatDayLong(a, false)}`;
    if (pa.y !== pb.y) return `del ${formatDayLong(a, true)} al ${formatDayLong(b, true)}`;
    if (pa.m !== pb.m) return `del ${formatDayLong(a)} al ${formatDayLong(b)}`;
    return `del ${pa.d} al ${pb.d} de ${MONTHS_ES[pa.m]}`;
}

const joinEs = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);
const nightsText = (n: number) => `${n} ${n === 1 ? "noche" : "noches"}`;

/** Lista de fechas sueltas agrupadas por mes: «6, 9 y 13 de diciembre» / «30 de noviembre y 2 de diciembre». */
function listDatesText(sorted: string[]): string {
    const groups: { key: string; label: string; days: number[] }[] = [];
    const multiYear = parts(sorted[0]).y !== parts(sorted[sorted.length - 1]).y;
    for (const iso of sorted) {
        const p = parts(iso);
        const key = `${p.y}-${p.m}`;
        let g = groups[groups.length - 1];
        if (!g || g.key !== key) { g = { key, label: `${MONTHS_ES[p.m]}${multiYear ? ` de ${p.y}` : ""}`, days: [] }; groups.push(g); }
        g.days.push(p.d);
    }
    return joinEs(groups.map((g) => `${joinEs(g.days.map(String))} de ${g.label}`));
}

/**
 * Resumen legible de las noches de una línea:
 *  - corridas:      «del 1 al 4 de diciembre: 3 noches»
 *  - recurrentes:   «Dom y lun, del 6 al 28 de diciembre: 8 noches»
 *  - sueltas:       «6, 9 y 13 de diciembre: 3 noches»
 */
export function summarizeDates(dates: string[]): string {
    if (dates.length === 0) return "";
    const s = sortDates(dates);
    const first = s[0], last = s[s.length - 1], n = s.length;

    const contiguous = s.every((d, i) => i === 0 || toMs(d) - toMs(s[i - 1]) === DAY_MS);
    if (contiguous) {
        return n === 1 ? `${formatDayLong(first)}: 1 noche` : `${formatRangeText(first, last)}: ${nightsText(n)}`;
    }

    const wds = Array.from(new Set(s.map(weekdayOf)));
    // «Recurrente» solo si cubre exactamente esos días de la semana en todo el rango Y cada día se repite
    // al menos 2 veces (si no, unas pocas fechas sueltas podrían parecer un patrón por casualidad).
    const repeatsEach = wds.every((w) => s.filter((d) => weekdayOf(d) === w).length >= 2);
    const regular = repeatsEach && recurringDates(first, last, wds).join(",") === s.join(",");
    if (regular) {
        const names = WEEK_ORDER.filter((w) => wds.includes(w)).map((w) => WEEKDAYS_ES[w]);
        const label = joinEs(names);
        return `${label.charAt(0).toUpperCase()}${label.slice(1)}, ${formatRangeText(first, last)}: ${nightsText(n)}`;
    }
    return `${listDatesText(s)}: ${nightsText(n)}`;
}

// ---------------------------------------------------------------------------
// Redacción de fechas (detalle, PDF, correo, formulario)
// ---------------------------------------------------------------------------

const MONTHS_SHORT_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS_FULL_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** «mar 8 dic» (con año si hace falta: «mar 30 dic 2026»). */
function formatDayShort(iso: string, withYear = false): string {
    const p = parts(iso);
    return `${WEEKDAYS_ES[weekdayOf(iso)]} ${p.d} ${MONTHS_SHORT_ES[p.m]}${withYear ? ` ${p.y}` : ""}`;
}

/**
 * Cómo se lee una línea según sus noches (el conteo aparece UNA sola vez):
 *  - noche única:  «Noche del 8 de diciembre»
 *  - corrida:      «Entrada mar 8 dic → Salida jue 10 dic (2 noches)»
 *  - recurrente:   «Noches de lunes y martes, del 7 al 29 de diciembre: 8 noches»
 *  - sueltas:      «Noches del 6, 9 y 13 de diciembre: 3 noches»
 */
/** Separador seguro para el PDF: la fuente estándar Helvetica no trae la flecha «→». */
export const PDF_SAFE_ARROW = "–";

export function describeDates(dates: string[], arrow = "→"): string {
    if (dates.length === 0) return "";
    const s = sortDates(dates);
    const first = s[0], last = s[s.length - 1], n = s.length;

    const contiguous = s.every((d, i) => i === 0 || toMs(d) - toMs(s[i - 1]) === DAY_MS);
    if (contiguous) {
        if (n === 1) return `Noche del ${formatDayLong(first)}`;
        const exit = addDays(last, 1);
        const withYear = parts(first).y !== parts(exit).y;
        return `Entrada ${formatDayShort(first, withYear)} ${arrow} Salida ${formatDayShort(exit, withYear)} (${nightsText(n)})`;
    }

    const wds = Array.from(new Set(s.map(weekdayOf)));
    const repeatsEach = wds.every((w) => s.filter((d) => weekdayOf(d) === w).length >= 2);
    if (repeatsEach && recurringDates(first, last, wds).join(",") === s.join(",")) {
        const names = WEEK_ORDER.filter((w) => wds.includes(w)).map((w) => WEEKDAYS_FULL_ES[w]);
        return `Noches de ${joinEs(names)}, ${formatRangeText(first, last)}: ${nightsText(n)}`;
    }
    return `Noches del ${listDatesText(s)}: ${nightsText(n)}`;
}

/**
 * Texto de fechas de una línea ya guardada. Las líneas con `dates` usan la redacción nueva;
 * las antiguas (sin `dates`) conservan exactamente la redacción de antes.
 */
export function describeLine(line: { dates?: string[] | null }, checkIn?: string | null, checkOut?: string | null, arrow = "→"): string {
    if (Array.isArray(line.dates) && line.dates.length > 0) return describeDates(line.dates, arrow);
    return summarizeDates(effectiveDates(line, checkIn, checkOut));
}

/**
 * Línea de estadía para detalle/correo.
 *  - todas las líneas comparten noches consecutivas: «Entrada: 1 de diciembre · Salida: 4 de diciembre · 3 noches»
 *  - recurrentes, sueltas o fechas distintas: «Primera noche: 7 de diciembre · Última noche: 29 de diciembre (salida 30 de diciembre)»
 */
export function stayText(lines: { dates?: string[] | null }[], checkIn?: string | null, checkOut?: string | null): { shared: boolean; text: string } {
    const all = lines.flatMap((l) => effectiveDates(l, checkIn, checkOut)).sort();
    if (all.length === 0) return { shared: true, text: "" };
    const first = all[0], last = all[all.length - 1], exit = addDays(last, 1);
    const withYear = parts(first).y !== parts(exit).y;
    // «Entrada / Salida / Noches» solo para una estadía continua: mismas fechas en todas las líneas y noches consecutivas.
    const own = effectiveDates(lines[0], checkIn, checkOut);
    const isContinuous = own.length > 0 && own.every((d, i) => i === 0 || d === addDays(own[i - 1], 1));
    const shared = linesShareDates(lines, checkIn, checkOut) && isContinuous;
    if (shared) {
        const n = effectiveDates(lines[0], checkIn, checkOut).length;
        return { shared, text: `Entrada: ${formatDayLong(first, withYear)} · Salida: ${formatDayLong(exit, withYear)} · ${nightsText(n)}` };
    }
    return {
        shared,
        text: `Primera noche: ${formatDayLong(first, withYear)} · Última noche: ${formatDayLong(last, withYear)} (salida ${formatDayLong(exit, withYear)})`,
    };
}

/** Fecha corta para la lista: «4 dic» (año solo si no es el año actual). Los datos guardados no cambian. */
export function formatListDate(iso: string, now: Date = new Date()): string {
    const p = parts(iso);
    return `${p.d} ${MONTHS_SHORT_ES[p.m]}${p.y !== now.getFullYear() ? ` ${p.y}` : ""}`;
}

export function formatQuoteCode(n: number): string {
    return `COT-${String(n).padStart(4, "0")}`;
}

export function addDays(dateIso: string, days: number): string {
    const d = new Date(dateIso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export const QUOTE_STATUSES = ["borrador", "enviada", "aceptada", "rechazada", "vencida"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Condiciones iniciales, tomadas del voucher (ReservationVoucher.tsx). */
export const DEFAULT_CONDITIONS = [
    "Habitaciones con baño privado.",
    "Incluye desayuno.",
    "Incluye estacionamiento privado sin costo, sujeto a disponibilidad.",
].join("\n");

export const DEFAULT_VALIDITY_DAYS = 7; // PROVISIONAL: pendiente de confirmar con el hostal
export type QuoteMode = "automatico" | "revision";
