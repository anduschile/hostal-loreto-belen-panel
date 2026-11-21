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
    nights: number;
    /** Tarifa escrita a mano. Si es > 0 pisa la de la tabla. */
    rate_override?: number | null;
};

export type QuoteLineResult = {
    occupancy: Occupancy;
    rooms: number;
    nights: number;
    rate: number; // tarifa neta/noche efectivamente usada
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
export function discountLabel(type?: unknown, value?: number | null): string {
    const t = normalizeDiscountType(type);
    const v = num(value);
    if (t === "porcentaje" && v > 0) return `Descuento convenio ${Number.isInteger(v) ? v : String(v).replace(".", ",")}%`;
    if (t === "monto_fijo" && v > 0) return `Descuento convenio $${Math.round(v).toLocaleString("es-CL")}`;
    return "Descuento";
}

export function calculateDiscount(gross: number, rawType?: unknown, value?: number | null): number {
    const type = normalizeDiscountType(rawType);
    const v = num(value);
    if (type === "ninguno" || v <= 0 || gross <= 0) return 0;
    if (type === "porcentaje") return Math.round((gross * Math.min(v, 100)) / 100);
    return Math.min(Math.round(v), gross); // monto_fijo: nunca más que el bruto
}

export function calculateQuote(input: QuoteCalcInput): QuoteCalcResult {
    const lines: QuoteLineResult[] = input.lines.map((l) => {
        const rooms = Math.floor(num(l.rooms));
        const nights = Math.floor(num(l.nights));
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
