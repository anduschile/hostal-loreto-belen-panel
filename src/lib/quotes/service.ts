// Flujo de cotizaciones con dependencias inyectadas (repositorio, PDF, correo),
// para poder probarlo sin base de datos ni correos reales.
import {
    addDays,
    normalizePassengers,
    passengersError,
    passengersText,
    calculateQuote,
    withTableIva,
    normalizeDiscountType,
    COMPANY_DISCOUNT_LABEL,
    MANUAL_DISCOUNT_LABEL,
    type DiscountMode,
    formatQuoteCode,
    nightsBetween,
    effectiveDates,
    periodFromDates,
    validateDates,
    describeLine,
    stayText,
    OCCUPANCY_LABELS,
    OCCUPANCIES,
    type DiscountType,
    type Occupancy,
    type QuoteCalcResult,
    type QuoteStatus,
    type RateTable,
} from "./calc";

export type QuoteSettings = {
    validity_days: number;
    validity_provisional: boolean;
    mode: "automatico" | "revision";
    default_conditions: string;
};

export type QuoteRow = {
    id: number;
    number: number;
    company_id: number | null;
    company_name: string;
    company_rut: string | null;
    contact_name: string | null;
    contact_email: string | null;
    check_in: string;
    check_out: string;
    /** `dates`: una fecha ISO por noche. Las cotizaciones antiguas no la tienen (usan el rango check_in/check_out). */
    lines: { occupancy: Occupancy; rooms: number; nights: number; dates?: string[]; rate_override: number | null; rate_with_iva?: number; passengers?: string[] }[];
    discount_type: DiscountType;
    discount_value: number;
    discount_label: string | null;
    gross: number;
    discount: number;
    net: number;
    iva: number;
    total: number;
    validity_days: number;
    valid_until: string | null;
    conditions: string | null;
    status: QuoteStatus;
    sent_at: string | null;
    created_at?: string;
};

export type QuoteInput = {
    company_id?: number | null;
    company_name: string;
    company_rut?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    check_in: string;
    check_out: string;
    /** `dates` opcional: si falta, la línea usa el rango entrada-salida de la cotización. */
    lines: { occupancy: Occupancy; rooms: number; dates?: string[]; rate_override?: number | null; rate_with_iva?: number | null; passengers?: unknown }[];
    /** «ninguno» | «empresa» | «manual». Si falta: «empresa» si la empresa tiene descuento; si no, «ninguno». */
    discount_mode?: DiscountMode;
    /** Solo modo manual */
    discount_type?: DiscountType;
    discount_value?: number;
    discount_reason?: string | null;
    validity_days?: number;
    conditions?: string | null;
};

export interface QuoteRepo {
    getRates(): Promise<RateTable>;
    getSettings(): Promise<QuoteSettings>;
    getCompanyDiscount(companyId: number): Promise<{ discount_type: DiscountType; discount_value: number } | null>;
    insertQuote(row: Omit<QuoteRow, "id" | "number" | "created_at">): Promise<QuoteRow>;
    getQuote(id: number): Promise<QuoteRow | null>;
    updateQuote(id: number, patch: Partial<QuoteRow>): Promise<QuoteRow>;
    deleteQuote(id: number): Promise<void>;
}

export type SendEmailParams = {
    toEmail: string;
    contactName?: string | null;
    code: string;
    pdfBuffer: Buffer;
    /** Una línea de texto por línea de habitaciones (fechas resumidas y subtotal), para el cuerpo del correo. */
    lineSummaries?: string[];
    /** Línea de estadía: «Entrada · Salida · N noches» o «Primera noche · Última noche (salida …)». */
    stay?: string;
    /** Pasajeros por línea de habitaciones (mismo orden que lineSummaries); «» si no hay. Texto libre: el correo lo escapa. */
    linePassengers?: string[];
};

const moneyCl = (n: number) => "$" + n.toLocaleString("es-CL");

/** «1 × Doble — Dom y lun, del 6 al 28 de diciembre: 8 noches — $440.000 neto» */
export function describeLines(quote: QuoteRow, calc: QuoteCalcResult): string[] {
    return calc.lines.map((l, i) => {
        return `${l.rooms} × ${OCCUPANCY_LABELS[l.occupancy]} — ${describeLine(quote.lines[i] ?? {}, quote.check_in, quote.check_out)} — ${moneyCl(l.subtotal)} neto`;
    });
}

export interface QuoteDeps {
    repo: QuoteRepo;
    renderPdf(quote: QuoteRow, calc: QuoteCalcResult): Promise<Buffer>;
    sendEmail(p: SendEmailParams): Promise<{ simulated: boolean }>;
}

export function validateQuoteInput(input: QuoteInput): string | null {
    if (!input.company_name?.trim()) return "Falta el nombre de la empresa.";
    if (!Array.isArray(input.lines) || !input.lines.length) return "Agrega al menos una línea de ocupación.";
    const rangeOk = nightsBetween(input.check_in, input.check_out) > 0;
    for (const l of input.lines) {
        if (!OCCUPANCIES.includes(l.occupancy)) return "Ocupación no válida.";
        if (!Number.isInteger(Number(l.rooms)) || Number(l.rooms) < 1) return "La cantidad de habitaciones debe ser 1 o más.";
        if (l.dates !== undefined && l.dates !== null) {
            const e = validateDates(l.dates);
            if (e) return e;
        } else if (!rangeOk) {
            return "El rango de fechas no es válido.";
        }
        const pe = passengersError(normalizePassengers(l.passengers));
        if (pe) return pe;
    }
    return null;
}

export function calcForRow(row: QuoteRow, rates: RateTable): QuoteCalcResult {
    return calculateQuote({
        lines: row.lines,
        rates,
        discount_type: row.discount_type,
        discount_value: row.discount_value,
    });
}

type ResolvedDiscount = { discount_type: DiscountType; discount_value: number; discount_label: string | null };
const NO_DISCOUNT: ResolvedDiscount = { discount_type: "ninguno", discount_value: 0, discount_label: null };

/** Decide y valida el descuento. Límites: porcentaje 0-100; monto fijo 0-bruto. */
async function resolveDiscount(deps: QuoteDeps, input: QuoteInput, gross: number): Promise<ResolvedDiscount> {
    const company = input.company_id ? await deps.repo.getCompanyDiscount(input.company_id) : null;
    const companyHas = !!company && normalizeDiscountType(company.discount_type) !== "ninguno" && Number(company.discount_value) > 0;
    const mode: DiscountMode = input.discount_mode ?? (companyHas ? "empresa" : "ninguno");

    if (mode === "ninguno") return NO_DISCOUNT;

    if (mode === "empresa") {
        if (!companyHas) throw new Error("La empresa elegida no tiene descuento configurado.");
        return {
            discount_type: normalizeDiscountType(company!.discount_type),
            discount_value: Number(company!.discount_value),
            discount_label: COMPANY_DISCOUNT_LABEL,
        };
    }

    if (mode === "manual") {
        const type = normalizeDiscountType(input.discount_type);
        if (type === "ninguno") throw new Error("Elige el tipo de descuento manual (porcentaje o monto fijo).");
        const value = Number(input.discount_value);
        if (!Number.isFinite(value) || value < 0) throw new Error("El valor del descuento no es válido.");
        if (type === "porcentaje" && value > 100) throw new Error("El porcentaje de descuento debe estar entre 0 y 100.");
        if (type === "monto_fijo" && value > gross) throw new Error("El descuento en monto fijo no puede superar el neto bruto de la cotización.");
        if (value === 0) return NO_DISCOUNT;
        return { discount_type: type, discount_value: value, discount_label: input.discount_reason?.trim() || MANUAL_DISCOUNT_LABEL };
    }

    throw new Error("Modo de descuento no válido.");
}

type QuoteFields = Omit<QuoteRow, "id" | "number" | "created_at" | "status" | "sent_at">;

/**
 * Valida y calcula todos los campos de una cotización. Los totales SIEMPRE se calculan en el servidor.
 * La tarifa efectiva de cada línea se guarda («congelada») en rate_override, para que un cambio
 * posterior en Tarifas no altere cotizaciones ya hechas.
 */
async function buildQuoteFields(deps: QuoteDeps, input: QuoteInput): Promise<QuoteFields> {
    const err = validateQuoteInput(input);
    if (err) throw new Error(err);

    const [rates, settings] = await Promise.all([deps.repo.getRates(), deps.repo.getSettings()]);

    // Noches por línea: las propias (`dates`) o, si faltan, las del rango entrada-salida. El servidor
    // las ordena y cuenta él mismo; cualquier «nights» que mande el navegador se ignora.
    // Tarifa: con IVA ingresada (rate_with_iva, exacta) > neta escrita a mano (rate_override) > tabla (se lee como con IVA).
    const rawLines = withTableIva(input.lines.map((l) => {
        const dates = effectiveDates({ dates: l.dates }, input.check_in, input.check_out);
        const passengers = normalizePassengers(l.passengers);
        const withIva = Math.round(Number(l.rate_with_iva));
        return {
            occupancy: l.occupancy,
            rooms: Number(l.rooms),
            nights: dates.length,
            dates,
            rate_override: withIva > 0 ? null : Number(l.rate_override) > 0 ? Number(l.rate_override) : null,
            ...(withIva > 0 ? { rate_with_iva: withIva } : {}),
            ...(passengers.length ? { passengers } : {}),
        };
    }), rates);
    // check_in = fecha mínima; check_out = fecha máxima + 1 día (la tabla exige check_out > check_in)
    const period = periodFromDates(rawLines.flatMap((l) => l.dates))!;
    // 1) bruto sin descuento (sirve para validar el monto fijo)
    const base = calculateQuote({ lines: rawLines, rates });
    if (base.has_missing_rates) {
        throw new Error("Hay líneas con «tarifa sin cargar»: escribe la tarifa a mano o carga las tarifas.");
    }
    // 2) descuento según el modo; siempre se resuelve en el servidor
    const { discount_type, discount_value, discount_label } = await resolveDiscount(deps, input, base.gross);
    // 3) cálculo final: el descuento va sobre el neto, antes de IVA
    const calc = calculateQuote({ lines: rawLines, rates, discount_type, discount_value });
    const lines = rawLines.map((l, i) => ({ ...l, rate_override: calc.lines[i].rate })); // tarifa congelada

    const validity_days = input.validity_days && input.validity_days > 0 ? input.validity_days : settings.validity_days;
    const today = new Date().toISOString().slice(0, 10);

    return {
        company_id: input.company_id ?? null,
        company_name: input.company_name.trim(),
        company_rut: input.company_rut?.trim() || null,
        contact_name: input.contact_name?.trim() || null,
        contact_email: input.contact_email?.trim() || null,
        check_in: period.check_in,
        check_out: period.check_out,
        lines,
        discount_type,
        discount_value,
        discount_label,
        gross: calc.gross,
        discount: calc.discount,
        net: calc.net,
        iva: calc.iva,
        total: calc.total,
        validity_days,
        valid_until: addDays(today, validity_days),
        conditions: input.conditions ?? settings.default_conditions,
    };
}

/** Crea la cotización en borrador. */
export async function createQuote(deps: QuoteDeps, input: QuoteInput): Promise<QuoteRow> {
    const fields = await buildQuoteFields(deps, input);
    return deps.repo.insertQuote({ ...fields, status: "borrador", sent_at: null });
}

/** Edita una cotización. Solo en borrador; los totales se recalculan en el servidor. */
export async function updateQuoteDraft(deps: QuoteDeps, id: number, input: QuoteInput): Promise<QuoteRow> {
    const current = await deps.repo.getQuote(id);
    if (!current) throw new Error("Cotización no encontrada");
    if (current.status !== "borrador") throw new Error("Solo se pueden editar cotizaciones en borrador. Usa «Duplicar como nueva».");
    const fields = await buildQuoteFields(deps, input);
    return deps.repo.updateQuote(id, fields);
}

/** Elimina una cotización. Solo en borrador. */
export async function deleteQuoteDraft(deps: QuoteDeps, id: number): Promise<void> {
    const current = await deps.repo.getQuote(id);
    if (!current) throw new Error("Cotización no encontrada");
    if (current.status !== "borrador") throw new Error("Solo se pueden eliminar cotizaciones en borrador.");
    await deps.repo.deleteQuote(id);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Genera el PDF y envía el correo. `toEmail` permite cambiar el destino antes de enviar.
 * Solo marca «enviada» si el correo salió de verdad (no simulado ni con error).
 */
export async function sendQuote(deps: QuoteDeps, id: number, opts: { toEmail?: string } = {}) {
    let quote = await deps.repo.getQuote(id);
    if (!quote) throw new Error("Cotización no encontrada");

    const target = (opts.toEmail ?? quote.contact_email ?? "").trim();
    if (!target) throw new Error("La cotización no tiene correo de contacto.");
    if (!EMAIL_RE.test(target)) throw new Error("El correo de destino no es válido.");
    if (target !== quote.contact_email) quote = await deps.repo.updateQuote(id, { contact_email: target });

    const rates = await deps.repo.getRates();
    const calc = calcForRow(quote, rates);
    const code = formatQuoteCode(quote.number);
    const pdfBuffer = await deps.renderPdf(quote, calc);

    const result = await deps.sendEmail({
        toEmail: target,
        contactName: quote.contact_name,
        code,
        pdfBuffer,
        lineSummaries: describeLines(quote, calc),
        linePassengers: quote.lines.map((l) => passengersText(l.passengers)),
        stay: stayText(quote.lines, quote.check_in, quote.check_out).text,
    });

    // Modo simulado: el correo NO salió, así que la cotización NO pasa a «enviada».
    if (result.simulated) return { quote, simulated: true, pdfBytes: pdfBuffer.length };

    // Un reenvío no cambia el estado de una cotización ya aceptada/rechazada/vencida; solo registra la fecha.
    const updated = await deps.repo.updateQuote(id, {
        ...(quote.status === "borrador" ? { status: "enviada" as const } : {}),
        sent_at: new Date().toISOString(),
    });
    return { quote: updated, simulated: result.simulated, pdfBytes: pdfBuffer.length };
}
