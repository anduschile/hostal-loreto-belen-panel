import { test } from "node:test";
import assert from "node:assert/strict";
import { stayOverlapsRange, isIsoDay, checkoutIsStrict } from "../src/lib/reservations/range";

// Rango de varios días: al menos una noche dentro (check_in <= to && check_out > from)
const FROM = "2026-12-10";
const TO = "2026-12-20";

test("estadía dentro del rango", () => {
    assert.equal(stayOverlapsRange("2026-12-12", "2026-12-15", FROM, TO), true);
});

test("cruza el borde inicial", () => {
    assert.equal(stayOverlapsRange("2026-12-08", "2026-12-12", FROM, TO), true);
});

test("cruza el borde final", () => {
    assert.equal(stayOverlapsRange("2026-12-18", "2026-12-23", FROM, TO), true);
});

test("varios días: sale el primer día del rango => EXCLUIDA", () => {
    assert.equal(stayOverlapsRange("2026-12-05", "2026-12-10", FROM, TO), false);
});

test("varios días: sale un día después de from => incluida (pasó una noche dentro)", () => {
    assert.equal(stayOverlapsRange("2026-12-05", "2026-12-11", FROM, TO), true);
});

test("varios días: llega el último día del rango => incluida", () => {
    assert.equal(stayOverlapsRange("2026-12-20", "2026-12-22", FROM, TO), true);
});

test("varios días: llega un día después de to => fuera", () => {
    assert.equal(stayOverlapsRange("2026-12-21", "2026-12-24", FROM, TO), false);
});

test("cubre todo el rango", () => {
    assert.equal(stayOverlapsRange("2026-12-01", "2026-12-31", FROM, TO), true);
});

test("termina justo antes de from => fuera", () => {
    assert.equal(stayOverlapsRange("2026-12-05", "2026-12-09", FROM, TO), false);
});

// Rango de un solo día (por defecto al abrir): llegadas, en curso y salidas de ese día
const DAY = "2026-12-10";

test("un día: llegada ese día => incluida", () => {
    assert.equal(stayOverlapsRange("2026-12-10", "2026-12-12", DAY, DAY), true);
});

test("un día: estadía en curso => incluida", () => {
    assert.equal(stayOverlapsRange("2026-12-08", "2026-12-12", DAY, DAY), true);
});

test("un día: salida ese día => incluida", () => {
    assert.equal(stayOverlapsRange("2026-12-08", "2026-12-10", DAY, DAY), true);
});

test("un día: salió el día anterior o llega al siguiente => fuera", () => {
    assert.equal(stayOverlapsRange("2026-12-07", "2026-12-09", DAY, DAY), false);
    assert.equal(stayOverlapsRange("2026-12-11", "2026-12-13", DAY, DAY), false);
});

test("checkoutIsStrict: solo en rangos de varios días", () => {
    assert.equal(checkoutIsStrict("2026-12-10", "2026-12-11"), true);
    assert.equal(checkoutIsStrict("2026-12-10", "2026-12-10"), false);
});

test("acepta fechas con hora y descarta datos inválidos", () => {
    assert.equal(stayOverlapsRange("2026-12-12T00:00:00+00:00", "2026-12-15", FROM, TO), true);
    assert.equal(stayOverlapsRange(null, "2026-12-15", FROM, TO), false);
    assert.equal(stayOverlapsRange("2026-12-12", "2026-12-15", "x", TO), false);
    assert.equal(isIsoDay("2026-12-10"), true);
    assert.equal(isIsoDay("10/12/2026"), false);
});
