import { test } from "node:test";
import assert from "node:assert/strict";
import {
    daysInMonth, lastDayOfMonth, firstDayOfMonth, nextDay, endAfterFromChange, exitAfterEntryChange, todayIso, parseIso,
} from "../src/lib/quotes/dateShortcuts";

test("último día del mes: febrero normal y bisiesto", () => {
    assert.equal(lastDayOfMonth("2027-02-10"), "2027-02-28");
    assert.equal(lastDayOfMonth("2028-02-01"), "2028-02-29"); // bisiesto
    assert.equal(lastDayOfMonth("2100-02-01"), "2100-02-28"); // siglo no bisiesto
    assert.equal(lastDayOfMonth("2000-02-01"), "2000-02-29"); // siglo bisiesto
    assert.equal(daysInMonth(2026, 2), 28);
});

test("último día: meses de 30 y 31 días y cambio de año", () => {
    assert.equal(lastDayOfMonth("2026-04-15"), "2026-04-30");
    assert.equal(lastDayOfMonth("2026-11-23"), "2026-11-30");
    assert.equal(lastDayOfMonth("2027-01-01"), "2027-01-31");
    assert.equal(lastDayOfMonth("2026-12-05"), "2026-12-31");
    assert.equal(lastDayOfMonth("2026-12-05", 1), "2027-01-31"); // cruza de año
    assert.equal(lastDayOfMonth("2026-12-05", 2), "2027-02-28");
    assert.equal(lastDayOfMonth("2027-12-31", 2), "2028-02-29");
    assert.equal(lastDayOfMonth("basura"), "");
});

test("primer día, día siguiente y validación", () => {
    assert.equal(firstDayOfMonth("2027-02-17"), "2027-02-01");
    assert.equal(nextDay("2026-12-31"), "2027-01-01");
    assert.equal(nextDay("2028-02-28"), "2028-02-29");
    assert.equal(nextDay("2027-02-28"), "2027-03-01");
    assert.equal(nextDay("2026-11-23"), "2026-11-24");
    assert.equal(parseIso("2027-02-29"), null);
    assert.equal(parseIso("2027-13-01"), null);
});

test("ajuste de «Hasta» al cambiar «Desde» (Recurrente) y de «Salida» al cambiar «Entrada» (Rango)", () => {
    assert.equal(endAfterFromChange("2027-01-10", ""), "2027-01-31");
    assert.equal(endAfterFromChange("2027-02-10", "2027-01-31"), "2027-02-28"); // Hasta quedó antes
    assert.equal(endAfterFromChange("2027-01-10", "2027-03-15"), "2027-03-15"); // válida: no se toca
    assert.equal(endAfterFromChange("2027-01-10", "2027-01-10"), "2027-01-10"); // igual: válida (1 día)
    assert.equal(endAfterFromChange("", "2027-03-15"), "2027-03-15");
    assert.equal(exitAfterEntryChange("2026-12-31", ""), "2027-01-01");
    assert.equal(exitAfterEntryChange("2026-12-10", "2026-12-10"), "2026-12-11");
    assert.equal(exitAfterEntryChange("2026-12-10", "2026-12-14"), "2026-12-14");
});

test("todayIso usa la fecha local, sin pasar por UTC", () => {
    assert.equal(todayIso(new Date(2026, 0, 1, 0, 30)), "2026-01-01");
    assert.equal(todayIso(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
});

import { monthGrid, monthTitle, nextRangeSelection, shiftMonth, weekdayOfYmd } from "../src/lib/quotes/dateShortcuts";

test("clic con inicio vacío: el día es el inicio", () => {
    assert.deepEqual(nextRangeSelection("", "", "2027-01-05", "rango"), { start: "2027-01-05", end: "" });
    assert.deepEqual(nextRangeSelection("", "", "2027-01-05", "recurrente"), { start: "2027-01-05", end: "" });
});

test("segundo clic posterior: es el fin (Rango y Recurrente)", () => {
    assert.deepEqual(nextRangeSelection("2027-01-05", "", "2027-02-28", "rango"), { start: "2027-01-05", end: "2027-02-28" });
    assert.deepEqual(nextRangeSelection("2027-01-05", "", "2027-02-28", "recurrente"), { start: "2027-01-05", end: "2027-02-28" });
});

test("segundo clic en el mismo día: Rango lo toma como nuevo inicio; Recurrente lo acepta como fin", () => {
    assert.deepEqual(nextRangeSelection("2027-01-05", "", "2027-01-05", "rango"), { start: "2027-01-05", end: "" });
    assert.deepEqual(nextRangeSelection("2027-01-05", "", "2027-01-05", "recurrente"), { start: "2027-01-05", end: "2027-01-05" });
});

test("segundo clic anterior al inicio: ese día es el nuevo inicio (ambos modos)", () => {
    assert.deepEqual(nextRangeSelection("2027-01-05", "", "2027-01-02", "rango"), { start: "2027-01-02", end: "" });
    assert.deepEqual(nextRangeSelection("2027-01-05", "", "2027-01-02", "recurrente"), { start: "2027-01-02", end: "" });
});

test("tercer clic: empieza una selección nueva", () => {
    assert.deepEqual(nextRangeSelection("2027-01-05", "2027-02-28", "2027-03-10", "rango"), { start: "2027-03-10", end: "" });
    assert.deepEqual(nextRangeSelection("2027-01-05", "2027-02-28", "2027-01-01", "recurrente"), { start: "2027-01-01", end: "" });
});

test("cuadrícula del mes: febrero normal y bisiesto", () => {
    const f27 = monthGrid(2027, 2);
    assert.equal(f27.filter((x) => x !== null).length, 28);
    const f28 = monthGrid(2028, 2);
    assert.equal(f28.filter((x) => x !== null).length, 29);
    assert.equal(f28[f28.length - 1], 29);
});

test("cuadrícula: mes que empieza en lunes (sin vacíos) y en domingo (6 vacíos)", () => {
    assert.equal(weekdayOfYmd(2027, 2, 1), 1); // 1 feb 2027 = lunes
    const lunes = monthGrid(2027, 2);
    assert.equal(lunes[0], 1);
    assert.equal(weekdayOfYmd(2026, 11, 1), 0); // 1 nov 2026 = domingo
    const domingo = monthGrid(2026, 11);
    assert.deepEqual(domingo.slice(0, 7), [null, null, null, null, null, null, 1]);
    assert.equal(domingo.length, 6 + 30);
    assert.equal(weekdayOfYmd(2027, 1, 1), 5); // 1 ene 2027 = viernes
    assert.equal(monthGrid(2027, 1).slice(0, 5).filter((x) => x === null).length, 4);
});

test("título del mes y desplazamiento entre años", () => {
    assert.equal(monthTitle(2027, 1), "Enero de 2027");
    assert.equal(monthTitle(2026, 12), "Diciembre de 2026");
    assert.deepEqual(shiftMonth(2026, 12, 1), { y: 2027, m: 1 });
    assert.deepEqual(shiftMonth(2027, 1, -1), { y: 2026, m: 12 });
    assert.deepEqual(shiftMonth(2027, 1, 13), { y: 2028, m: 2 });
});
