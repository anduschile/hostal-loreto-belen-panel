// Pasajeros por línea (opcional). Decisión de límites: lo que supera 200 entradas o 160 caracteres por entrada
// se RECHAZA con un error claro (no se trunca en silencio, para no perder nombres sin que nadie lo note).
import { test } from "node:test";
import assert from "node:assert/strict";
import { rangeDates, normalizePassengers, passengersText, passengersError, MAX_PASSENGER_CHARS, MAX_PASSENGER_ENTRIES, type RateTable } from "../src/lib/quotes/calc";
import { createQuote, updateQuoteDraft, sendQuote, describeLines, type QuoteDeps, type QuoteRow } from "../src/lib/quotes/service";
import { buildQuoteEmail } from "../src/lib/email/sendQuoteEmail";

const rates: RateTable = { single: 40000, doble: 55000, triple: 70000, cuadruple: 85000 };
function memoryDeps() {
    const store = new Map<number, QuoteRow>();
    let seq = 0;
    const sent: any[] = [];
    const deps: QuoteDeps = {
        repo: {
            getRates: async () => rates,
            getSettings: async () => ({ validity_days: 7, validity_provisional: true, mode: "revision", default_conditions: "x" }),
            getCompanyDiscount: async () => null,
            insertQuote: async (row) => { const q = { ...row, id: ++seq, number: seq } as QuoteRow; store.set(q.id, q); return q; },
            getQuote: async (id) => store.get(id) ?? null,
            updateQuote: async (id, patch) => { const q = { ...store.get(id)!, ...patch }; store.set(id, q); return q; },
            deleteQuote: async (id) => { store.delete(id); },
        },
        renderPdf: async () => Buffer.from("%PDF-fake"),
        sendEmail: async (p) => { sent.push(p); return { simulated: false }; },
    };
    return { deps, sent };
}
const base = { company_id: null as number | null, company_name: "Empresa", contact_email: "a@b.cl", check_in: "2026-12-01", check_out: "2026-12-02" };
const dates = rangeDates("2026-12-01", "2026-12-03");
const line = (passengers?: unknown) => ({ occupancy: "doble" as const, rooms: 2, dates, passengers });

test("línea sin pasajeros: no se guarda la clave", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [line()] });
    assert.equal("passengers" in q.lines[0], false);
    assert.equal(passengersText(q.lines[0].passengers), "");
});

test("1 y 2 pasajeros por habitación, numerados por habitación", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [{ ...line(["Maximiliano Rojas / Cristian Jara", "Juan Pérez"]), rooms: 2 }] });
    assert.deepEqual(q.lines[0].passengers, ["Maximiliano Rojas / Cristian Jara", "Juan Pérez"]);
    assert.equal(passengersText(q.lines[0].passengers), "1. Maximiliano Rojas / Cristian Jara · 2. Juan Pérez");
});

test("entradas vacías, espacios y caracteres de control", () => {
    assert.deepEqual(normalizePassengers(["  Ana  ", "", "   ", "B\u0000ob\u0007", "\n"]), ["Ana", "Bob"]);
});

test("valores que no son arreglo de strings se ignoran", async () => {
    assert.deepEqual(normalizePassengers("Ana"), []);
    assert.deepEqual(normalizePassengers({ 0: "Ana" }), []);
    assert.deepEqual(normalizePassengers(null), []);
    assert.deepEqual(normalizePassengers(["Ana", 5, null, { a: 1 }, ["x"]]), ["Ana"]);
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [line("Ana, Bob")] });
    assert.equal("passengers" in q.lines[0], false);
});

test("entrada de 160 caracteres se acepta; de 161 se RECHAZA (no se trunca)", async () => {
    const { deps } = memoryDeps();
    const ok = await createQuote(deps, { ...base, lines: [line(["a".repeat(MAX_PASSENGER_CHARS)])] });
    assert.equal(ok.lines[0].passengers![0].length, 160);
    await assert.rejects(() => createQuote(deps, { ...base, lines: [line(["a".repeat(161)])] }), /160 caracteres/);
    // los espacios de los bordes no cuentan
    const padded = await createQuote(deps, { ...base, lines: [line(["  " + "a".repeat(160) + "  "])] });
    assert.equal(padded.lines[0].passengers![0].length, 160);
});

test("más de 200 entradas se rechaza; exactamente 200 se acepta; las vacías no cuentan", async () => {
    const { deps } = memoryDeps();
    const mk = (n: number) => Array.from({ length: n }, (_, i) => `P${i}`);
    const ok = await createQuote(deps, { ...base, lines: [line([...mk(MAX_PASSENGER_ENTRIES), "", "  "])] });
    assert.equal(ok.lines[0].passengers!.length, 200);
    await assert.rejects(() => createQuote(deps, { ...base, lines: [line(mk(201))] }), /200 entradas/);
    assert.equal(passengersError(mk(201)), "Una línea admite como máximo 200 entradas de pasajeros.");
});

test("el correo escapa los nombres (HTML en texto libre)", async () => {
    const evil = `<script>alert("x")</script> & O'Brien / <b>Bob</b>`;
    const { deps, sent } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [line([evil])] });
    await sendQuote(deps, q.id);
    const html = buildQuoteEmail(sent[0]).html;
    assert.ok(html.includes("Pasajeros: 1. "));
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<b>Bob"));
    assert.ok(html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; O&#39;Brien / &lt;b&gt;Bob&lt;/b&gt;"));
});

test("correo sin pasajeros no muestra «Pasajeros»", async () => {
    const { deps, sent } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [line()] });
    await sendQuote(deps, q.id);
    assert.ok(!buildQuoteEmail(sent[0]).html.includes("Pasajeros"));
});

test("cotización antigua sin la clave: describe, calcula y reenvía igual", async () => {
    const { deps, sent } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [line()] });
    const old = { ...q, lines: [{ occupancy: "doble", rooms: 2, nights: 2, rate_override: 55000 }] } as unknown as QuoteRow;
    assert.equal(passengersText((old.lines[0] as any).passengers), "");
    assert.equal(describeLines(old, { lines: [{ occupancy: "doble", rooms: 2, nights: 2, rate: 55000, rate_missing: false, subtotal: 220000 }] } as any).length, 1);
    await sendQuote({ ...deps, repo: { ...deps.repo, getQuote: async () => old } }, q.id);
    assert.deepEqual(sent[0].linePassengers, [""]);
});

test("editar conserva pasajeros (y quitarlos los borra); duplicar = crear con las mismas líneas", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [line(["Ana / Luis", "Eva"])] });
    // el formulario reenvía los pasajeros guardados al editar/duplicar
    const edited = await updateQuoteDraft(deps, q.id, { ...base, lines: [{ ...line(q.lines[0].passengers), rooms: 3 }] });
    assert.deepEqual(edited.lines[0].passengers, ["Ana / Luis", "Eva"]);
    const dup = await createQuote(deps, { ...base, lines: q.lines.map((l) => ({ occupancy: l.occupancy, rooms: l.rooms, dates: l.dates, rate_override: l.rate_override, passengers: l.passengers })) });
    assert.deepEqual(dup.lines[0].passengers, ["Ana / Luis", "Eva"]);
    const cleared = await updateQuoteDraft(deps, q.id, { ...base, lines: [line([])] });
    assert.equal("passengers" in cleared.lines[0], false);
});
