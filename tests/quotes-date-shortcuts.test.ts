import { test } from "node:test";
import assert from "node:assert/strict";
import {
    daysInMonth, lastDayOfMonth, firstDayOfMonth, nextDay, monthShortcuts, extendTargets, endAfterFromChange, exitAfterEntryChange, todayIso, parseIso,
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

test("6 meses desde el actual, cruzando de diciembre a enero", () => {
    const m = monthShortcuts("2026-11-23", 6);
    assert.deepEqual(m.map((x) => x.label), ["Nov 2026", "Dic 2026", "Ene 2027", "Feb 2027", "Mar 2027", "Abr 2027"]);
    assert.deepEqual(m[0], { label: "Nov 2026", from: "2026-11-23", to: "2026-11-30" }); // el mes actual parte hoy
    assert.deepEqual(m[1], { label: "Dic 2026", from: "2026-12-01", to: "2026-12-31" });
    assert.deepEqual(m[2], { label: "Ene 2027", from: "2027-01-01", to: "2027-01-31" });
    assert.deepEqual(m[3], { label: "Feb 2027", from: "2027-02-01", to: "2027-02-28" });
    assert.equal(monthShortcuts("2027-12-10", 3).map((x) => x.label).join(","), "Dic 2027,Ene 2028,Feb 2028");
    assert.equal(monthShortcuts("2027-12-10", 3)[2].to, "2028-02-29");
    assert.equal(monthShortcuts("", 6).length, 0);
});

test("«Extender hasta»: fin del mes de Desde y de los dos siguientes", () => {
    assert.deepEqual(extendTargets("2027-01-01"), ["2027-01-31", "2027-02-28", "2027-03-31"]);
    assert.deepEqual(extendTargets("2026-12-15"), ["2026-12-31", "2027-01-31", "2027-02-28"]);
    assert.deepEqual(extendTargets("2027-12-15"), ["2027-12-31", "2028-01-31", "2028-02-29"]);
    assert.deepEqual(extendTargets(""), []);
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
