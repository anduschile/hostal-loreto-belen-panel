// Fechas por línea y noches recurrentes.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    summarizeDates, recurringDates, rangeDates, effectiveDates, validateDates, periodFromDates, linesShareDates, weekdayOf, isValidIsoDate,
    type RateTable,
} from "../src/lib/quotes/calc";
import { createQuote, sendQuote, updateQuoteDraft, describeLines, calcForRow, type QuoteDeps, type QuoteRow } from "../src/lib/quotes/service";
import { buildQuoteEmail } from "../src/lib/email/sendQuoteEmail";

const rates: RateTable = { single: 40000, doble: 55000, triple: 70000, cuadruple: 85000 };

function memoryDeps() {
    const store = new Map<number, QuoteRow>();
    let seq = 0;
    const deps: QuoteDeps = {
        repo: {
            getRates: async () => rates,
            getSettings: async () => ({ validity_days: 7, validity_provisional: true, mode: "revision", default_conditions: "Incluye desayuno." }),
            getCompanyDiscount: async () => null,
            insertQuote: async (row) => { const q = { ...row, id: ++seq, number: seq } as QuoteRow; store.set(q.id, q); return q; },
            getQuote: async (id) => store.get(id) ?? null,
            updateQuote: async (id, patch) => { const q = { ...store.get(id)!, ...patch }; store.set(id, q); return q; },
            deleteQuote: async (id) => { store.delete(id); },
        },
        renderPdf: async () => Buffer.from("%PDF-fake"),
        sendEmail: async () => ({ simulated: true }),
    };
    return { deps, store };
}

const base = { company_id: null as number | null, company_name: "Empresa Test", contact_email: "ana@example.com", check_in: "2026-12-01", check_out: "2026-12-02" };

test("línea con rango propio: sus noches no dependen del rango general", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [{ occupancy: "doble", rooms: 2, dates: rangeDates("2026-12-10", "2026-12-14") }] });
    assert.equal(q.lines[0].nights, 4);
    assert.equal(q.net, 55000 * 2 * 4);
    assert.equal(q.check_in, "2026-12-10");
    assert.equal(q.check_out, "2026-12-14"); // última noche (13) + 1
});

test("dos líneas con fechas distintas: 1 doble x 3 noches y 1 single x 1 noche", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [
        { occupancy: "doble", rooms: 1, dates: rangeDates("2026-12-01", "2026-12-04") },
        { occupancy: "single", rooms: 1, dates: ["2026-12-20"] },
    ] });
    assert.equal(q.lines[0].nights, 3);
    assert.equal(q.lines[1].nights, 1);
    assert.equal(q.net, 55000 * 3 + 40000 * 1);
    assert.equal(q.check_in, "2026-12-01");
    assert.equal(q.check_out, "2026-12-21"); // fecha máxima + 1 día
    assert.ok(q.check_out > q.check_in);
    assert.equal(linesShareDates(q.lines, q.check_in, q.check_out), false);
});

test("recurrencia: domingos y lunes de diciembre 2026 con 8 habitaciones -> 8 noches y 64 habitaciones-noche", async () => {
    assert.equal(weekdayOf("2026-12-06"), 0); // domingo
    const dates = recurringDates("2026-12-01", "2026-12-31", [0, 1]);
    assert.deepEqual(dates, ["2026-12-06", "2026-12-07", "2026-12-13", "2026-12-14", "2026-12-20", "2026-12-21", "2026-12-27", "2026-12-28"]);
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [{ occupancy: "doble", rooms: 8, dates }] });
    assert.equal(q.lines[0].nights, 8);
    assert.equal(q.lines[0].rooms * q.lines[0].nights, 64); // habitaciones-noche
    assert.equal(q.net, 55000 * 64);
    assert.equal(q.check_in, "2026-12-06");
    assert.equal(q.check_out, "2026-12-29");
    assert.equal(summarizeDates(dates), "Dom y lun, del 6 al 28 de diciembre: 8 noches");
});

test("resúmenes de fechas: corrida, recurrente, sueltas, cruce de mes y de año", () => {
    assert.equal(summarizeDates(rangeDates("2026-12-01", "2026-12-04")), "del 1 al 3 de diciembre: 3 noches");
    assert.equal(summarizeDates(["2026-12-20"]), "20 de diciembre: 1 noche");
    assert.equal(summarizeDates(["2026-12-06", "2026-12-09", "2026-12-13"]), "6, 9 y 13 de diciembre: 3 noches");
    assert.equal(summarizeDates(["2026-11-30", "2026-12-02"]), "30 de noviembre y 2 de diciembre: 2 noches");
    assert.equal(summarizeDates(rangeDates("2026-12-30", "2027-01-02")), "del 30 de diciembre de 2026 al 1 de enero de 2027: 3 noches");
    assert.ok(summarizeDates(recurringDates("2026-12-01", "2026-12-31", [1, 2, 3, 4, 5])).startsWith("Lun, mar, mié, jue y vie, del 1 al 31 de diciembre"));
});

test("compatibilidad: cotización antigua sin dates usa el rango entrada-salida", async () => {
    const { deps } = memoryDeps();
    const old: any = {
        id: 99, number: 99, company_id: null, company_name: "Antigua", company_rut: null, contact_name: null, contact_email: "a@b.cl",
        check_in: "2026-12-01", check_out: "2026-12-04",
        lines: [{ occupancy: "doble", rooms: 2, nights: 3, rate_override: 50000 }], // sin `dates`
        discount_type: "ninguno", discount_value: 0, discount_label: null, gross: 300000, discount: 0, net: 300000, iva: 57000, total: 357000,
        validity_days: 7, valid_until: null, conditions: null, status: "enviada", sent_at: null,
    };
    assert.deepEqual(effectiveDates(old.lines[0], old.check_in, old.check_out), ["2026-12-01", "2026-12-02", "2026-12-03"]);
    const c = calcForRow(old, rates);
    assert.equal(c.net, 300000);
    assert.equal(c.lines[0].nights, 3);
    assert.equal(linesShareDates(old.lines, old.check_in, old.check_out), true);
    assert.match(describeLines(old, c)[0], /2 × Doble — del 1 al 3 de diciembre: 3 noches — \$300\.000 neto/);
    deps.repo.getQuote = async () => old;
    deps.repo.updateQuote = async (_id, patch) => ({ ...old, ...patch });
    assert.equal((await sendQuote(deps, 99)).simulated, true); // se puede reenviar sin migrar
});

test("entradas inválidas: fechas mal formadas, duplicadas, vacías o de más", async () => {
    const { deps } = memoryDeps();
    const mk = (dates: unknown) => createQuote(deps, { ...base, lines: [{ occupancy: "doble", rooms: 1, dates: dates as any }] });
    await assert.rejects(() => mk([]), /al menos una noche/);
    await assert.rejects(() => mk("2026-12-01"), /al menos una noche/);
    await assert.rejects(() => mk(["2026-13-01"]), /Fecha no válida/);
    await assert.rejects(() => mk(["2026-02-31"]), /Fecha no válida/);
    await assert.rejects(() => mk(["01/12/2026"]), /Fecha no válida/);
    await assert.rejects(() => mk(["1999-12-01"]), /Fecha no válida/);
    await assert.rejects(() => mk([20261201]), /Fecha no válida/);
    await assert.rejects(() => mk(["2026-12-01", "2026-12-01"]), /repetidas/);
    const big = rangeDates("2026-01-01", "2027-01-02"); // 366 noches
    assert.equal(big.length, 366);
    assert.equal((await mk(big)).lines[0].nights, 366); // el máximo exacto sí se acepta
    await assert.rejects(() => mk([...big, "2027-01-02"]), /más de 366/);
    // sin dates y sin rango válido
    await assert.rejects(() => createQuote(deps, { ...base, check_out: "2026-12-01", lines: [{ occupancy: "doble", rooms: 1 }] }), /rango de fechas/);
    assert.equal(isValidIsoDate("2026-12-31"), true);
    assert.equal(validateDates(["2026-12-31"]), null);
});

test("el servidor ignora noches y período mandados por el navegador", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, check_in: "2020-01-01", check_out: "2020-02-01", lines: [{ occupancy: "doble", rooms: 1, dates: ["2026-12-05", "2026-12-06"], nights: 99 } as any] });
    assert.equal(q.lines[0].nights, 2);
    assert.equal(q.check_in, "2026-12-05");
    assert.equal(q.check_out, "2026-12-07");
    assert.equal(q.net, 110000);
});

test("líneas sin dates en una cotización nueva usan el rango general", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, check_in: "2026-12-01", check_out: "2026-12-04", lines: [{ occupancy: "doble", rooms: 1 }] });
    assert.deepEqual(q.lines[0].dates, ["2026-12-01", "2026-12-02", "2026-12-03"]);
});

test("editar conserva y permite cambiar las fechas por línea; el período se recalcula", async () => {
    const { deps } = memoryDeps();
    const q = await createQuote(deps, { ...base, lines: [
        { occupancy: "doble", rooms: 1, dates: rangeDates("2026-12-01", "2026-12-04") },
        { occupancy: "single", rooms: 1, dates: ["2026-12-20"] },
    ] });
    // «editar sin tocar»: se reenvían las mismas fechas
    const same = await updateQuoteDraft(deps, q.id, { ...base, lines: q.lines.map((l) => ({ occupancy: l.occupancy, rooms: l.rooms, dates: l.dates, rate_override: l.rate_override })) });
    assert.deepEqual(same.lines.map((l) => l.dates), q.lines.map((l) => l.dates));
    assert.equal(same.net, q.net);
    // cambiar las fechas de la segunda línea a recurrentes
    const ed = await updateQuoteDraft(deps, q.id, { ...base, lines: [
        { occupancy: "doble", rooms: 1, dates: q.lines[0].dates },
        { occupancy: "single", rooms: 2, dates: recurringDates("2026-12-01", "2026-12-31", [0]) },
    ] });
    assert.equal(ed.lines[1].nights, 4);
    assert.equal(ed.net, 55000 * 3 + 40000 * 2 * 4);
    assert.equal(ed.check_out, "2026-12-28"); // domingo 27 + 1
});

test("correo: lista una línea por línea de habitaciones con fechas y subtotal", async () => {
    const { deps } = memoryDeps();
    let captured: string[] | undefined;
    deps.sendEmail = async (p) => { captured = p.lineSummaries; return { simulated: true }; };
    const q = await createQuote(deps, { ...base, lines: [{ occupancy: "doble", rooms: 8, dates: recurringDates("2026-12-01", "2026-12-31", [0, 1]) }] });
    await sendQuote(deps, q.id);
    assert.equal(captured?.length, 1);
    assert.match(captured![0], /8 × Doble — Noches de domingo y lunes, del 6 al 28 de diciembre: 8 noches — \$3\.520\.000 neto/);
    const e = buildQuoteEmail({ toEmail: "a@b.cl", code: "COT-0001", pdfBuffer: Buffer.from("x"), lineSummaries: captured, stay: "Primera noche: 6 de diciembre" });
    assert.match(e.html, /Noches de domingo y lunes, del 6 al 28 de diciembre/);
    assert.match(e.html, /Primera noche: 6 de diciembre/);
});

// ---------- redacción de fechas ----------
import { describeDates, describeLine, stayText, PDF_SAFE_ARROW } from "../src/lib/quotes/calc";

test("línea en modo Rango: «Entrada mar 8 dic → Salida jue 10 dic (2 noches)»", () => {
    assert.equal(describeDates(rangeDates("2026-12-08", "2026-12-10")), "Entrada mar 8 dic → Salida jue 10 dic (2 noches)");
    assert.equal(describeDates(rangeDates("2026-12-01", "2026-12-02")), "Noche del 1 de diciembre"); // 1 noche = noche única
    assert.equal(describeDates(rangeDates("2026-12-30", "2027-01-02")), "Entrada mié 30 dic 2026 → Salida sáb 2 ene 2027 (3 noches)");
});

test("línea en modo Recurrente: «Noches de lunes y martes, del 7 al 29 de diciembre: 8 noches»", () => {
    const dates = recurringDates("2026-12-07", "2026-12-29", [1, 2]);
    assert.equal(dates.length, 8);
    assert.equal(describeDates(dates), "Noches de lunes y martes, del 7 al 29 de diciembre: 8 noches");
    assert.equal(describeDates(recurringDates("2026-12-01", "2026-12-31", [0, 1])), "Noches de domingo y lunes, del 6 al 28 de diciembre: 8 noches");
});

test("noche única suelta y fechas sueltas", () => {
    assert.equal(describeDates(["2026-12-08"]), "Noche del 8 de diciembre");
    assert.equal(describeDates(["2026-12-06", "2026-12-09", "2026-12-13"]), "Noches del 6, 9 y 13 de diciembre: 3 noches");
    assert.equal(describeDates(["2026-11-30", "2026-12-02"]), "Noches del 30 de noviembre y 2 de diciembre: 2 noches");
});

test("el conteo de noches aparece una sola vez en cada redacción", () => {
    for (const d of [rangeDates("2026-12-08", "2026-12-10"), recurringDates("2026-12-07", "2026-12-29", [1, 2]), ["2026-12-06", "2026-12-09", "2026-12-13"], ["2026-12-08"]]) {
        const t = describeDates(d);
        assert.ok((t.match(/\d+ noches?/g) ?? []).length <= 1, t); // nunca «N noches — …: N noches»
        assert.ok(!/\d+ noches? — /.test(t), t);
    }
});

test("«Estadía»: fechas distintas -> primera/última noche y salida; compartidas -> Entrada · Salida · noches", () => {
    const l1 = { dates: recurringDates("2026-12-07", "2026-12-29", [1, 2]) };
    const l2 = { dates: ["2026-12-08"] };
    const s = stayText([l1, l2], "2026-12-07", "2026-12-30");
    assert.equal(s.shared, false);
    assert.equal(s.text, "Primera noche: 7 de diciembre · Última noche: 29 de diciembre (salida 30 de diciembre)");
    const same = stayText([{ dates: rangeDates("2026-12-01", "2026-12-04") }, { dates: rangeDates("2026-12-01", "2026-12-04") }], "2026-12-01", "2026-12-04");
    assert.equal(same.shared, true);
    assert.equal(same.text, "Entrada: 1 de diciembre · Salida: 4 de diciembre · 3 noches");
});

test("PDF: el separador de Entrada/Salida es compatible con la fuente Helvetica (sin «→»)", () => {
    const line = { dates: rangeDates("2026-12-08", "2026-12-10") };
    assert.equal(describeLine(line, null, null), "Entrada mar 8 dic → Salida jue 10 dic (2 noches)"); // pantalla y correo
    const pdf = describeLine(line, null, null, PDF_SAFE_ARROW);
    assert.equal(pdf, "Entrada mar 8 dic – Salida jue 10 dic (2 noches)");
    assert.ok(!pdf.includes("→"));
});

test("cotización antigua sin dates: la redacción de fechas sigue igual que antes", () => {
    const oldLine = { occupancy: "doble", rooms: 2, nights: 3, rate_override: 50000 } as any;
    assert.equal(describeLine(oldLine, "2026-12-01", "2026-12-04"), "del 1 al 3 de diciembre: 3 noches"); // formato anterior
    const s = stayText([oldLine], "2026-12-01", "2026-12-04");
    assert.equal(s.shared, true);
    assert.equal(s.text, "Entrada: 1 de diciembre · Salida: 4 de diciembre · 3 noches");
});

test("periodFromDates: check_out = máxima + 1 día", () => {
    assert.deepEqual(periodFromDates(["2026-12-31", "2026-12-05"]), { check_in: "2026-12-05", check_out: "2027-01-01" });
    assert.equal(periodFromDates([]), null);
});
