// Las fechas de las reservas (columnas date) no deben retroceder un día en America/Santiago.
// Este archivo corre en su propio proceso (node --test), así que fijar TZ aquí no afecta a otras pruebas.
process.env.TZ = "America/Santiago";

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDateCL } from "../src/lib/utils/date";

test("la zona horaria de la prueba es Santiago (UTC-3 en verano)", () => {
    // Si esto fallara, la prueba de abajo no demostraría nada.
    assert.equal(new Date("2026-12-15T12:00:00Z").getTimezoneOffset(), 180);
});

test("el patrón antiguo (new Date sobre YYYY-MM-DD) sí retrocede un día en Santiago", () => {
    assert.equal(new Date("2026-12-01").getDate(), 30);
    assert.equal(new Date("2026-11-30").getDate(), 29);
});

test("formatDateCL muestra la fecha real, sin retroceder", () => {
    assert.equal(formatDateCL("2026-12-01"), "01-12-2026");
    assert.equal(formatDateCL("2026-11-30"), "30-11-2026");
    assert.equal(formatDateCL("2026-01-05"), "05-01-2026");
});

test("el corte slice(0, 10) que usa la lista tolera valores con hora", () => {
    assert.equal(formatDateCL(String("2026-12-01T00:00:00+00:00").slice(0, 10)), "01-12-2026");
});
