// ¿Hay que validar el solapamiento al guardar? + nota de autorización + marcado en calendario.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    appendNote,
    blocksRoom,
    buildOverrideNote,
    overlapMap,
    shouldValidateOverlap,
    type ReservationShape,
} from "../src/lib/reservations/overlap";

const base: ReservationShape = {
    room_id: 10,
    fulfillment_type: "INTERNAL",
    status: "confirmed",
    check_in: "2026-12-27",
    check_out: "2026-12-30",
};

test("creación bloqueante: se valida", () => {
    assert.equal(shouldValidateOverlap(null, base), true);
    assert.equal(shouldValidateOverlap(null, { ...base, status: "pending" }), true);
});

test("creación cancelada (o con estado ignorado): no se valida", () => {
    for (const status of ["cancelled", "cancelada", "checked_out", "salida"]) {
        assert.equal(shouldValidateOverlap(null, { ...base, status }), false, status);
    }
});

test("reserva externa o sin room_id: no se valida", () => {
    assert.equal(shouldValidateOverlap(null, { ...base, room_id: null }), false);
    assert.equal(shouldValidateOverlap(null, { ...base, fulfillment_type: "EXTERNAL" }), false);
    assert.equal(shouldValidateOverlap({ ...base }, { ...base, room_id: null, fulfillment_type: "EXTERNAL" }), false);
});

test("edición sin cambios relevantes: no se valida (las ya solapadas siguen editables)", () => {
    assert.equal(shouldValidateOverlap(base, { ...base }), false);
    // cambia confirmed -> checked_in (ambos bloquean) y nada más
    assert.equal(shouldValidateOverlap(base, { ...base, status: "checked_in" }), false);
    // misma fecha con otro formato (con hora) no cuenta como cambio
    assert.equal(shouldValidateOverlap(base, { ...base, check_in: "2026-12-27T00:00:00+00:00" }), false);
});

test("edición que cambia fechas: se valida", () => {
    assert.equal(shouldValidateOverlap(base, { ...base, check_in: "2026-12-26" }), true);
    assert.equal(shouldValidateOverlap(base, { ...base, check_out: "2026-12-31" }), true);
});

test("edición que cambia habitación: se valida", () => {
    assert.equal(shouldValidateOverlap(base, { ...base, room_id: 11 }), true);
});

test("cambio de estado de cancelled a pending (o confirmed): se valida", () => {
    const cancelled = { ...base, status: "cancelled" };
    assert.equal(shouldValidateOverlap(cancelled, { ...base, status: "pending" }), true);
    assert.equal(shouldValidateOverlap(cancelled, { ...base, status: "confirmed" }), true);
    assert.equal(shouldValidateOverlap({ ...base, status: "checked_out" }, { ...base, status: "checked_in" }), true);
});

test("cancelación: nunca se valida", () => {
    assert.equal(shouldValidateOverlap(base, { ...base, status: "cancelled" }), false);
    assert.equal(shouldValidateOverlap(base, { ...base, status: "cancelled", check_in: "2026-12-01" }), false);
});

test("externa que pasa a interna con habitación: se valida", () => {
    const ext = { ...base, room_id: null, fulfillment_type: "EXTERNAL" };
    assert.equal(shouldValidateOverlap(ext, base), true);
});

test("blocksRoom", () => {
    assert.equal(blocksRoom(base), true);
    assert.equal(blocksRoom({ ...base, status: " Cancelled " }), false);
    assert.equal(blocksRoom({ ...base, fulfillment_type: null }), false);
});

test("nota de autorización en hora de Santiago", () => {
    // 2026-12-02 15:30 UTC = 12:30 en Santiago (verano, UTC-3)
    assert.equal(
        buildOverrideNote("jefe@hostal.cl", new Date("2026-12-02T15:30:00Z")),
        "Solapamiento autorizado por jefe@hostal.cl el 02/12/2026 12:30"
    );
    assert.equal(
        buildOverrideNote("jefe@hostal.cl", new Date("2026-07-02T15:30:00Z")),
        "Solapamiento autorizado por jefe@hostal.cl el 02/07/2026 11:30"
    );
});

test("appendNote agrega la línea al final", () => {
    assert.equal(appendNote(null, "X"), "X");
    assert.equal(appendNote("", "X"), "X");
    assert.equal(appendNote("hola", "X"), "hola\nX");
    assert.equal(appendNote("hola\n\n", "X"), "hola\nX");
});

test("overlapMap marca ambas reservas solapadas con el código de la otra", () => {
    const now = new Date("2026-12-01T12:00:00Z");
    const mk = (id: number, code: string, ci: string, co: string, extra: object = {}) => ({
        id, code, room_id: 10, fulfillment_type: "INTERNAL", status: "confirmed", check_in: ci, check_out: co, ...extra,
    });
    const list = [
        mk(1, "R1", "2026-12-27", "2026-12-30"),
        mk(2, "R2", "2026-12-28", "2026-12-31"),
        mk(3, "R3", "2026-12-30", "2027-01-02"), // entra el día que sale R1: no solapa con R1, sí con R2
        mk(4, "R4", "2026-12-28", "2026-12-30", { room_id: 11 }), // otra habitación
        mk(5, "R5", "2026-12-28", "2026-12-30", { status: "cancelled" }), // ignorada
    ];
    const m = overlapMap(list, now);
    assert.deepEqual(m.get(1), ["R2"]);
    assert.deepEqual(m.get(2), ["R1", "R3"]);
    assert.deepEqual(m.get(3), ["R2"]);
    assert.equal(m.has(4), false);
    assert.equal(m.has(5), false);
});
