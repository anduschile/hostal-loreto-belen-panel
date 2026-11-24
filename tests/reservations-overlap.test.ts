// Regla de solapamiento de reservas por habitación.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findOverlaps, type OverlapReservation } from "../src/lib/reservations/overlap";

const NOW = new Date("2026-12-01T12:00:00Z");

function r(p: Partial<OverlapReservation> & { id: number }): OverlapReservation {
    return {
        room_id: 10,
        fulfillment_type: "INTERNAL",
        status: "confirmed",
        check_in: "2026-12-27",
        check_out: "2026-12-30",
        hold_expires_at: null,
        ...p,
    };
}
const q = { room_id: 10, check_in: "2026-12-28", check_out: "2026-12-30" };
const ids = (list: OverlapReservation[]) => list.map((x) => x.id);

test("cruce parcial en la misma habitación se detecta (días 28 y 29)", () => {
    assert.deepEqual(ids(findOverlaps([r({ id: 1 })], q, NOW)), [1]);
});

test("salida igual a entrada no solapa (en ambos sentidos)", () => {
    assert.deepEqual(findOverlaps([r({ id: 1, check_in: "2026-12-26", check_out: "2026-12-28" })], q, NOW), []);
    assert.deepEqual(findOverlaps([r({ id: 2, check_in: "2026-12-30", check_out: "2027-01-02" })], q, NOW), []);
});

test("misma reserva exacta y reserva que contiene a la nueva se detectan", () => {
    const list = [r({ id: 1, check_in: "2026-12-28", check_out: "2026-12-30" }), r({ id: 2, check_in: "2026-12-20", check_out: "2027-01-05" })];
    assert.deepEqual(ids(findOverlaps(list, q, NOW)), [1, 2]);
});

test("estados cancelled, cancelada, checked_out y salida se ignoran", () => {
    for (const status of ["cancelled", "cancelada", "checked_out", "salida", "CANCELLED"]) {
        assert.deepEqual(findOverlaps([r({ id: 1, status })], q, NOW), [], status);
    }
    for (const status of ["pending", "confirmed", "checked_in", "blocked"]) {
        assert.equal(findOverlaps([r({ id: 1, status })], q, NOW).length, 1, status);
    }
});

test("pending con hold vencido se ignora; vigente o sin hold cuenta", () => {
    assert.deepEqual(findOverlaps([r({ id: 1, status: "pending", hold_expires_at: "2026-12-01T11:00:00Z" })], q, NOW), []);
    assert.deepEqual(findOverlaps([r({ id: 2, status: "pending", hold_expires_at: "2026-12-01T12:00:00Z" })], q, NOW), []); // <= ahora
    assert.equal(findOverlaps([r({ id: 3, status: "pending", hold_expires_at: "2026-12-01T13:00:00Z" })], q, NOW).length, 1);
    assert.equal(findOverlaps([r({ id: 4, status: "pending", hold_expires_at: null })], q, NOW).length, 1);
    // un hold vencido en una reserva confirmada no la libera
    assert.equal(findOverlaps([r({ id: 5, status: "confirmed", hold_expires_at: "2026-12-01T11:00:00Z" })], q, NOW).length, 1);
});

test("al editar se excluye la propia reserva", () => {
    const list = [r({ id: 7 }), r({ id: 8 })];
    assert.deepEqual(ids(findOverlaps(list, { ...q, exclude_id: 7 }, NOW)), [8]);
});

test("habitación distinta no solapa", () => {
    assert.deepEqual(findOverlaps([r({ id: 1, room_id: 11 })], q, NOW), []);
});

test("reserva externa o sin room_id se ignora", () => {
    assert.deepEqual(findOverlaps([r({ id: 1, room_id: null })], q, NOW), []);
    assert.deepEqual(findOverlaps([r({ id: 2, fulfillment_type: "EXTERNAL" })], q, NOW), []);
    assert.deepEqual(findOverlaps([r({ id: 3, fulfillment_type: null })], q, NOW), []);
});

test("acepta check_in/check_out con hora (usa solo la fecha)", () => {
    assert.equal(findOverlaps([r({ id: 1, check_in: "2026-12-27T00:00:00+00:00", check_out: "2026-12-29T00:00:00+00:00" })], q, NOW).length, 1);
});
