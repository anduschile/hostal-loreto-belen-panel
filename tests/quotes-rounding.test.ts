// Redondeo con tarifas «con IVA»: el total con IVA debe ser exactamente Σ habitaciones × noches × tarifa con IVA.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateQuote, ivaRateFromNet, rangeDates, withTableIva, type RateTable } from "../src/lib/quotes/calc";
import { createQuote, calcForRow, type QuoteDeps, type QuoteRow } from "../src/lib/quotes/service";

function deps(rates: RateTable) {
    const store = new Map<number, QuoteRow>();
    let seq = 0;
    const d: QuoteDeps = {
        repo: {
            getRates: async () => rates,
            getSettings: async () => ({ validity_days: 7, validity_provisional: true, mode: "revision", default_conditions: "x" }),
            getCompanyDiscount: async () => null,
            insertQuote: async (row) => { const q = { ...row, id: ++seq, number: seq } as QuoteRow; store.set(q.id, q); return q; },
            getQuote: async (id) => store.get(id) ?? null,
            updateQuote: async (id, patch) => { const q = { ...store.get(id)!, ...patch }; store.set(q.id, q); return q; },
            deleteQuote: async (id) => { store.delete(id); },
        },
        renderPdf: async () => Buffer.from("%PDF-fake"),
        sendEmail: async () => ({ simulated: true }),
    };
    return d;
}
const base = { company_id: null as number | null, company_name: "Empresa", contact_email: "a@b.cl", check_in: "2026-12-01", check_out: "2026-12-02" };
const eightNights = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06", "2026-12-07", "2026-12-08"];
const sumSub = (q: { lines: { subtotal: number }[] }) => q.lines.reduce((s, l) => s + l.subtotal, 0);

// Tarifas generales como las deja la tabla (net_rate entero): 60000 con IVA -> 50420; 50000 con IVA -> 42017
const tableRates: RateTable = { single: 42017, doble: 50420, triple: 0, cuadruple: 0 };

test("COT-0006 con tarifas con IVA escritas por línea: total exacto $530.000", async () => {
    const q = await createQuote(deps(tableRates), { ...base, lines: [
        { occupancy: "doble", rooms: 1, dates: eightNights, rate_with_iva: 60000 },
        { occupancy: "single", rooms: 1, dates: ["2026-12-09"], rate_with_iva: 50000 },
    ] });
    assert.equal(q.total, 8 * 60000 + 50000);
    assert.equal(q.total, 530000);
    assert.equal(q.net, 445378);
    assert.equal(q.iva, 84622);
    assert.equal(q.net + q.iva, q.total);
    const c = calcForRow(q, tableRates);
    assert.equal(sumSub(c), q.net); // los subtotales por línea cuadran con el neto
    assert.equal(q.lines[0].rate_with_iva, 60000); // la tarifa con IVA ingresada queda guardada
});

test("COT-0006 con tarifas generales (tabla) con IVA: también $530.000", async () => {
    const q = await createQuote(deps(tableRates), { ...base, lines: [
        { occupancy: "doble", rooms: 1, dates: eightNights },
        { occupancy: "single", rooms: 1, dates: ["2026-12-09"] },
    ] });
    assert.equal(q.total, 530000);
    assert.equal(q.net, 445378);
    assert.equal(q.iva, 84622);
    assert.deepEqual(q.lines.map((l) => l.rate_with_iva), [60000, 50000]); // 50420 -> 60000; 42017 -> 50000
    assert.deepEqual(q.lines.map((l) => l.rate_override), [50420, 42017]); // neto redondeado, como antes
});

test("tarifa NETA escrita a mano: comportamiento sin cambios", async () => {
    const q = await createQuote(deps(tableRates), { ...base, lines: [
        { occupancy: "doble", rooms: 2, dates: eightNights, rate_override: 50000 },
    ] });
    assert.equal(q.net, 50000 * 2 * 8);
    assert.equal(q.iva, Math.round(800000 * 0.19));
    assert.equal(q.total, 800000 + 152000);
    assert.equal("rate_with_iva" in q.lines[0], false);
});

test("cotización antigua (rate_override entero, sin rate_with_iva): se calcula igual que antes", () => {
    const old = calculateQuote({
        lines: [
            { occupancy: "doble", rooms: 1, nights: 8, rate_override: 50420 },
            { occupancy: "single", rooms: 1, nights: 1, rate_override: 42017 },
        ],
        rates: tableRates,
    });
    assert.equal(old.net, 445377);
    assert.equal(old.iva, 84622);
    assert.equal(old.total, 529999); // el valor histórico de COT-0006: no se reescribe
    assert.equal(sumSub(old), old.net);
});

test("descuento porcentual con tarifas con IVA", async () => {
    const q = await createQuote(deps(tableRates), { ...base, discount_mode: "manual", discount_type: "porcentaje", discount_value: 10, lines: [
        { occupancy: "doble", rooms: 1, dates: eightNights, rate_with_iva: 60000 },
        { occupancy: "single", rooms: 1, dates: ["2026-12-09"], rate_with_iva: 50000 },
    ] });
    assert.equal(q.gross, 445378);
    assert.equal(q.discount, 44538);
    assert.equal(q.net, q.gross - q.discount);
    assert.equal(q.total, 477000); // 530000 menos 10% exacto
    assert.equal(q.net + q.iva, q.total);
});

test("descuento de monto fijo (neto) con tarifas con IVA", async () => {
    const q = await createQuote(deps(tableRates), { ...base, discount_mode: "manual", discount_type: "monto_fijo", discount_value: 50000, lines: [
        { occupancy: "doble", rooms: 1, dates: eightNights, rate_with_iva: 60000 },
        { occupancy: "single", rooms: 1, dates: ["2026-12-09"], rate_with_iva: 50000 },
    ] });
    assert.equal(q.discount, 50000);
    assert.equal(q.net, 445378 - 50000);
    assert.equal(q.total, Math.round((530000 / 1.19 - 50000) * 1.19)); // 470.500
    assert.equal(q.total, 470500);
    assert.equal(q.net + q.iva, q.total);
});

test("línea con IVA mezclada con línea neta: cuadra y el total sale del valor con IVA", () => {
    const c = calculateQuote({
        lines: [
            { occupancy: "doble", rooms: 3, nights: 5, dates: rangeDates("2026-12-01", "2026-12-06"), rate_with_iva: 60000 },
            { occupancy: "single", rooms: 1, nights: 2, dates: ["2026-12-01", "2026-12-02"], rate_override: 40000 },
        ],
        rates: tableRates,
    });
    assert.equal(c.total, Math.round(3 * 5 * 60000 + 2 * 40000 * 1.19));
    assert.equal(sumSub(c), c.gross);
    assert.equal(c.net + c.iva, c.total);
});

test("ivaRateFromNet: recupera el valor con IVA que se tecleó", () => {
    assert.equal(ivaRateFromNet(50420), 60000);
    assert.equal(ivaRateFromNet(42017), 50000);
    assert.equal(ivaRateFromNet(0), 0);
    for (const v of [30000, 45000, 59990, 65000, 80000, 95000, 119000]) assert.equal(ivaRateFromNet(Math.round(v / 1.19)), v);
});

test("withTableIva no toca líneas con tarifa propia", () => {
    const out = withTableIva([
        { occupancy: "doble" as const, rate_override: 1000 },
        { occupancy: "doble" as const, rate_with_iva: 70000 },
        { occupancy: "doble" as const },
    ], tableRates);
    assert.equal((out[0] as any).rate_with_iva, undefined);
    assert.equal(out[1].rate_with_iva, 70000);
    assert.equal(out[2].rate_with_iva, 60000);
});

// ---- Casos con la tarifa neta de la tabla 50.420 (= 60.000 con IVA) y descuento porcentual ----
const nights = (n: number) => rangeDates("2026-12-01", `2026-12-${String(1 + n).padStart(2, "0")}`);

async function totalFor(n: number, rooms: number, pct?: number) {
    const q = await createQuote(deps(tableRates), {
        ...base, ...(pct ? { discount_mode: "manual" as const, discount_type: "porcentaje" as const, discount_value: pct } : {}),
        lines: [{ occupancy: "doble", rooms, dates: nights(n) }],
    });
    assert.equal(q.net + q.iva, q.total);
    return q;
}

test("tabla 50.420: 17 noches, 1 habitación, sin descuento = $1.020.000", async () => {
    assert.equal((await totalFor(17, 1)).total, 1020000);
});

test("tabla 50.420: 17 noches, 1 habitación, descuento 25% = $765.000 (no $764.997)", async () => {
    assert.equal((await totalFor(17, 1, 25)).total, 765000);
});

test("tabla 50.420: 9 noches, 2 habitaciones, descuento 25% = $810.000", async () => {
    assert.equal((await totalFor(9, 2, 25)).total, 810000);
});

test("tabla 50.420: 2 noches, 1 habitación, sin descuento = $120.000 (no cambia)", async () => {
    assert.equal((await totalFor(2, 1)).total, 120000);
});
