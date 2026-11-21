import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateQuote, nightsBetween, formatQuoteCode, type RateTable } from "../src/lib/quotes/calc";
import { createQuote, sendQuote, type QuoteDeps, type QuoteRow } from "../src/lib/quotes/service";
import { generateQuotePdfBuffer } from "../src/lib/pdf/generateQuotePdf";
import { sendQuoteEmail, buildQuoteEmail } from "../src/lib/email/sendQuoteEmail";

const rates: RateTable = { single: 40000, doble: 55000, triple: 70000, cuadruple: 85000 };

// ---------- cálculo ----------
test("neto, IVA 19% sumado al neto y total", () => {
    const r = calculateQuote({ rates, lines: [{ occupancy: "doble", rooms: 2, nights: 3 }] });
    assert.equal(r.net, 330000);
    assert.equal(r.iva, 62700);
    assert.equal(r.total, 392700);
    assert.equal(r.has_missing_rates, false);
});

test("varias líneas suman", () => {
    const r = calculateQuote({ rates, lines: [{ occupancy: "single", rooms: 1, nights: 2 }, { occupancy: "triple", rooms: 1, nights: 2 }] });
    assert.equal(r.net, 80000 + 140000);
});

test("descuento porcentaje se aplica antes del IVA", () => {
    const r = calculateQuote({ rates, lines: [{ occupancy: "doble", rooms: 1, nights: 10 }], discount_type: "porcentaje", discount_value: 10 });
    assert.equal(r.gross, 550000);
    assert.equal(r.discount, 55000);
    assert.equal(r.net, 495000);
    assert.equal(r.iva, Math.round(495000 * 0.19));
    assert.equal(r.total, r.net + r.iva);
});

test("descuento monto fijo no supera el bruto", () => {
    const r = calculateQuote({ rates, lines: [{ occupancy: "single", rooms: 1, nights: 1 }], discount_type: "monto_fijo", discount_value: 999999 });
    assert.equal(r.net, 0);
    assert.equal(r.total, 0);
});

test("tarifa en cero se marca; la tarifa manual la reemplaza", () => {
    const zero: RateTable = { ...rates, doble: 0 };
    const missing = calculateQuote({ rates: zero, lines: [{ occupancy: "doble", rooms: 1, nights: 2 }] });
    assert.equal(missing.has_missing_rates, true);
    assert.equal(missing.lines[0].rate_missing, true);
    assert.equal(missing.net, 0);

    const manual = calculateQuote({ rates: zero, lines: [{ occupancy: "doble", rooms: 1, nights: 2, rate_override: 60000 }] });
    assert.equal(manual.has_missing_rates, false);
    assert.equal(manual.net, 120000);
});

test("noches y código correlativo", () => {
    assert.equal(nightsBetween("2026-12-01", "2026-12-04"), 3);
    assert.equal(nightsBetween("2026-12-04", "2026-12-01"), 0);
    assert.equal(formatQuoteCode(7), "COT-0007");
});

// ---------- flujo crear -> PDF -> enviar (simulado) ----------
function memoryDeps() {
    const store = new Map<number, QuoteRow>();
    let seq = 0;
    const deps: QuoteDeps = {
        repo: {
            getRates: async () => rates,
            getSettings: async () => ({ validity_days: 7, validity_provisional: true, mode: "revision", default_conditions: "Habitaciones con baño privado.\nIncluye desayuno." }),
            getCompanyDiscount: async (id) => (id === 1 ? { discount_type: "porcentaje", discount_value: 10 } : null),
            insertQuote: async (row) => { const q = { ...row, id: ++seq, number: seq } as QuoteRow; store.set(q.id, q); return q; },
            getQuote: async (id) => store.get(id) ?? null,
            updateQuote: async (id, patch) => { const q = { ...store.get(id)!, ...patch }; store.set(id, q); return q; },
            deleteQuote: async (id) => { store.delete(id); },
        },
        renderPdf: (q, calc) => generateQuotePdfBuffer(q, calc),
        sendEmail: sendQuoteEmail,
    };
    return { deps, store };
}

const input = {
    company_id: 1, company_name: "Empresa Test", company_rut: "76.123.456-7", contact_name: "Ana", contact_email: "ana@example.com",
    check_in: "2026-12-01", check_out: "2026-12-04", lines: [{ occupancy: "doble" as const, rooms: 2 }],
};

test("crear cotización: totales recalculados en servidor con descuento de empresa", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, input);
    assert.equal(q.status, "borrador");
    assert.equal(formatQuoteCode(q.number), "COT-0001");
    assert.equal(q.gross, 330000);
    assert.equal(q.net, 297000);
    assert.equal(q.total, 297000 + Math.round(297000 * 0.19));
    assert.equal(q.validity_days, 7);
});

test("crear rechaza tarifa sin cargar", async () => {
    const { deps } = memoryDeps();
    deps.repo.getRates = async () => ({ ...rates, doble: 0 });
    await assert.rejects(() => createQuote(deps, input), /tarifa sin cargar/);
});

test("crear + PDF + enviar en modo simulado", async () => {
    delete process.env.QUOTES_EMAIL_MODE; // por defecto: simulado
    const { deps, store } = memoryDeps();
    const q = await createQuote(deps, input);
    const r = await sendQuote(deps, q.id);
    assert.equal(r.simulated, true);
    assert.ok(r.pdfBytes > 1000);
    // simulado: el correo NO salió -> NO debe quedar «enviada»
    assert.equal(store.get(q.id)!.status, "borrador");
    assert.equal(store.get(q.id)!.sent_at, null);
});

test("envío real (no simulado) sí marca «enviada»", async () => {
    const { deps, store } = memoryDeps();
    deps.sendEmail = async () => ({ simulated: false });
    const q = await createQuote(deps, input);
    const r = await sendQuote(deps, q.id);
    assert.equal(r.simulated, false);
    assert.equal(store.get(q.id)!.status, "enviada");
    assert.ok(store.get(q.id)!.sent_at);
});

test("PDF generado es un PDF válido", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, input);
    const buf = await generateQuotePdfBuffer(q, (await import("../src/lib/quotes/service")).calcForRow(q, rates));
    assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
});

test("correo: asunto, remitente, cierre y adjunto", () => {
    const e = buildQuoteEmail({ toEmail: "a@b.cl", code: "COT-0001", contactName: "Ana", pdfBuffer: Buffer.from("x") });
    assert.equal(e.subject, "Cotización Hostal Loreto Belén (COT-0001)");
    assert.equal(e.from, "Hostal Loreto Belén <reservas@loretobelen.cl>");
    assert.match(e.html, /Saludos,/);
    assert.ok(!e.html.includes('href="#"'));
    assert.equal(e.attachments[0].filename, "cotizacion_COT-0001.pdf");
});

test("si el envío falla, la cotización NO queda como enviada", async () => {
    const { deps, store } = memoryDeps();
    deps.sendEmail = async () => { throw new Error("boom"); };
    const q = await createQuote(deps, input);
    await assert.rejects(() => sendQuote(deps, q.id), /boom/);
    assert.equal(store.get(q.id)!.status, "borrador");
});

// ---------- descuento: tipo nulo / etiquetas ----------
import { normalizeDiscountType, discountLabel } from "../src/lib/quotes/calc";

test("discount_type nulo, vacío o desconocido se trata como «ninguno»", () => {
    for (const v of [null, undefined, "", "monto", "PORCENTAJE"]) assert.equal(normalizeDiscountType(v), "ninguno");
    assert.equal(normalizeDiscountType("porcentaje"), "porcentaje");
    assert.equal(normalizeDiscountType("monto_fijo"), "monto_fijo"); // mismo valor que el CHECK de hostal_quotes
    const r = calculateQuote({ rates, lines: [{ occupancy: "doble", rooms: 1, nights: 1 }], discount_type: null, discount_value: 25 });
    assert.equal(r.discount, 0);
    assert.equal(r.net, 55000);
});

test("etiqueta del descuento indica porcentaje o monto", () => {
    assert.equal(discountLabel("porcentaje", 25), "Descuento convenio 25%");
    assert.equal(discountLabel("porcentaje", 12.5), "Descuento convenio 12,5%");
    assert.match(discountLabel("monto_fijo", 50000), /^Descuento convenio \$50\.000$/);
    assert.equal(discountLabel(null, 25), "Descuento");
});

test("crear cotización con empresa de discount_type nulo: sin descuento", async () => {
    const { deps } = memoryDeps();
    deps.repo.getCompanyDiscount = async () => ({ discount_type: normalizeDiscountType(null), discount_value: 0 });
    const q = await createQuote(deps, input);
    assert.equal(q.discount_type, "ninguno");
    assert.equal(q.discount, 0);
    assert.equal(q.net, 330000);
});

// ---------- edición, eliminación, envío con otro correo, IVA en tarifas ----------
import { updateQuoteDraft, deleteQuoteDraft } from "../src/lib/quotes/service";
import { toNetRate, withIva } from "../src/lib/quotes/calc";

test("editar borrador: total recalculado en servidor, conserva número y estado", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...input, company_id: null });
    const e = await updateQuoteDraft(deps, q.id, { ...input, company_id: null, lines: [{ occupancy: "doble", rooms: 4 }] });
    assert.equal(e.number, q.number);
    assert.equal(e.status, "borrador");
    assert.equal(e.net, 55000 * 4 * 3);
    assert.equal(e.total, e.net + Math.round(e.net * 0.19));
});

test("editar: un total mandado por el cliente se ignora", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...input, company_id: null });
    const e = await updateQuoteDraft(deps, q.id, { ...input, company_id: null, total: 1, net: 1 } as any);
    assert.equal(e.net, 55000 * 2 * 3);
});

test("editar no se permite fuera de borrador", async () => {
    const { deps, store } = memoryDeps();
    const q = await createQuote(deps, input);
    for (const st of ["enviada", "aceptada", "rechazada", "vencida"] as const) {
        store.set(q.id, { ...store.get(q.id)!, status: st });
        await assert.rejects(() => updateQuoteDraft(deps, q.id, input), /borrador/);
        await assert.rejects(() => deleteQuoteDraft(deps, q.id), /borrador/);
    }
});

test("eliminar borrador funciona", async () => {
    const { deps, store } = memoryDeps();
    const q = await createQuote(deps, input);
    await deleteQuoteDraft(deps, q.id);
    assert.equal(store.has(q.id), false);
});

test("la tarifa se congela: cambiar Tarifas después no altera la cotización", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...input, company_id: null });
    assert.equal(q.lines[0].rate_override, 55000);
    const later: RateTable = { ...rates, doble: 99999 };
    const c = (await import("../src/lib/quotes/service")).calcForRow(q, later);
    assert.equal(c.net, q.net);
});

test("descuento porcentaje (Acuimag 25%), monto_fijo y nulo en la cotización", async () => {
    const { deps } = memoryDeps();
    const base = { ...input, company_id: 6 };
    deps.repo.getCompanyDiscount = async () => ({ discount_type: "porcentaje", discount_value: 25 });
    const p = await createQuote(deps, base);
    assert.equal(p.discount, 82500);          // 25% de 330.000
    assert.equal(p.net, 247500);
    assert.ok(p.total < 330000 + Math.round(330000 * 0.19)); // el total baja

    deps.repo.getCompanyDiscount = async () => ({ discount_type: "monto_fijo", discount_value: 50000 });
    const m = await createQuote(deps, base);
    assert.equal(m.discount, 50000);
    assert.equal(m.net, 280000);

    deps.repo.getCompanyDiscount = async () => ({ discount_type: normalizeDiscountType(null), discount_value: 0 });
    const n = await createQuote(deps, base);
    assert.equal(n.discount, 0);
    assert.equal(n.net, 330000);
});

test("enviar con otro correo: valida, actualiza el destino y no marca enviada si es simulado", async () => {
    delete process.env.QUOTES_EMAIL_MODE;
    const { deps, store } = memoryDeps();
    const q = await createQuote(deps, input);
    await assert.rejects(() => sendQuote(deps, q.id, { toEmail: "no-es-correo" }), /no es válido/);
    const r = await sendQuote(deps, q.id, { toEmail: "otro@example.com" });
    assert.equal(r.simulated, true);
    assert.equal(store.get(q.id)!.contact_email, "otro@example.com");
    assert.equal(store.get(q.id)!.status, "borrador");
});

test("conversión IVA de tarifas: con IVA -> neto = round(valor/1.19); neto se mantiene", () => {
    assert.equal(toNetRate(119000, "con_iva"), 100000);
    assert.equal(toNetRate(55000, "con_iva"), 46218);
    assert.equal(toNetRate(55000, "neto"), 55000);
    assert.equal(withIva(100000), 119000);
    // estable: neto -> con IVA -> neto devuelve el mismo neto
    for (const n of [1, 999, 46218, 50000, 123457]) assert.equal(toNetRate(withIva(n), "con_iva"), n);
});
