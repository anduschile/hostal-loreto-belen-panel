import { test } from "node:test";
import assert from "node:assert/strict";
import { stayOverlapsRange, isIsoDay } from "../src/lib/reservations/range";

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

test("termina justo en from: entra (check_out >= from)", () => {
    assert.equal(stayOverlapsRange("2026-12-05", "2026-12-10", FROM, TO), true);
});

test("empieza justo en to: entra (check_in <= to)", () => {
    assert.equal(stayOverlapsRange("2026-12-20", "2026-12-22", FROM, TO), true);
});

test("cubre todo el rango", () => {
    assert.equal(stayOverlapsRange("2026-12-01", "2026-12-31", FROM, TO), true);
});

test("termina un día antes de from: no entra", () => {
    assert.equal(stayOverlapsRange("2026-12-05", "2026-12-09", FROM, TO), false);
});

test("empieza un día después de to: no entra", () => {
    assert.equal(stayOverlapsRange("2026-12-21", "2026-12-24", FROM, TO), false);
});

test("rango de un solo día (hoy..hoy)", () => {
    assert.equal(stayOverlapsRange("2026-12-09", "2026-12-11", "2026-12-10", "2026-12-10"), true);
    assert.equal(stayOverlapsRange("2026-12-11", "2026-12-12", "2026-12-10", "2026-12-10"), false);
});

test("acepta fechas con hora y descarta datos inválidos", () => {
    assert.equal(stayOverlapsRange("2026-12-12T00:00:00+00:00", "2026-12-15", FROM, TO), true);
    assert.equal(stayOverlapsRange(null, "2026-12-15", FROM, TO), false);
    assert.equal(stayOverlapsRange("2026-12-12", "2026-12-15", "x", TO), false);
    assert.equal(isIsoDay("2026-12-10"), true);
    assert.equal(isIsoDay("10/12/2026"), false);
});
