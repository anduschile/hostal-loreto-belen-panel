// Flujo de cotizaciones con dependencias inyectadas (repositorio, PDF, correo),
// para poder probarlo sin base de datos ni correos reales.
import {
    addDays,
    calculateQuote,
    normalizeDiscountType,
    formatQuoteCode,
    nightsBetween,
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
    lines: { occupancy: Occupancy; rooms: number; nights: number; rate_override: number | null }[];
    discount_type: DiscountType;
    discount_value: number;
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
    lines: { occupancy: Occupancy; rooms: number; rate_override?: number | null }[];
    discount_type?: DiscountType;
    discount_value?: number;
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
};

export interface QuoteDeps {
    repo: QuoteRepo;
    renderPdf(quote: QuoteRow, calc: QuoteCalcResult): Promise<Buffer>;
    sendEmail(p: SendEmailParams): Promise<{ simulated: boolean }>;
}

export function validateQuoteInput(input: QuoteInput): string | null {
    if (!input.company_name?.trim()) return "Falta el nombre de la empresa.";
    if (nightsBetween(input.check_in, input.check_out) <= 0) return "El rango de fechas no es válido.";
    if (!input.lines?.length) return "Agrega al menos una línea de ocupación.";
    for (const l of input.lines) {
        if (!OCCUPANCIES.includes(l.occupancy)) return "Ocupación no válida.";
        if (!Number.isInteger(Number(l.rooms)) || Number(l.rooms) < 1) return "La cantidad de habitaciones debe ser 1 o más.";
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
    const nights = nightsBetween(input.check_in, input.check_out);

    let discount_type: DiscountType = normalizeDiscountType(input.discount_type);
    let discount_value = input.discount_value ?? 0;
    if (input.company_id && discount_type === "ninguno") {
        const d = await deps.repo.getCompanyDiscount(input.company_id);
        if (d) ({ discount_type, discount_value } = d);
    }

    const rawLines = input.lines.map((l) => ({
        occupancy: l.occupancy,
        rooms: Number(l.rooms),
        nights,
        rate_override: Number(l.rate_override) > 0 ? Number(l.rate_override) : null,
    }));
    const calc = calculateQuote({ lines: rawLines, rates, discount_type, discount_value });
    if (calc.has_missing_rates) {
        throw new Error("Hay líneas con «tarifa sin cargar»: escribe la tarifa a mano o carga las tarifas.");
    }
    const lines = rawLines.map((l, i) => ({ ...l, rate_override: calc.lines[i].rate })); // tarifa congelada

    const validity_days = input.validity_days && input.validity_days > 0 ? input.validity_days : settings.validity_days;
    const today = new Date().toISOString().slice(0, 10);

    return {
        company_id: input.company_id ?? null,
        company_name: input.company_name.trim(),
        company_rut: input.company_rut?.trim() || null,
        contact_name: input.contact_name?.trim() || null,
        contact_email: input.contact_email?.trim() || null,
        check_in: input.check_in,
        check_out: input.check_out,
        lines,
        discount_type,
        discount_value,
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
    });

    // Modo simulado: el correo NO salió, así que la cotización NO pasa a «enviada».
    if (result.simulated) return { quote, simulated: true, pdfBytes: pdfBuffer.length };

    const updated = await deps.repo.updateQuote(id, {
        status: "enviada",
        sent_at: new Date().toISOString(),
    });
    return { quote: updated, simulated: result.simulated, pdfBytes: pdfBuffer.length };
}
