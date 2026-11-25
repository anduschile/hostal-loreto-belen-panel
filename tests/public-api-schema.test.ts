// Esquemas Zod de la API pública.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    AvailabilityQuerySchema,
    ReservationRequestSchema,
    isRealDate,
    nightsBetween,
    issueFields,
} from "../src/lib/public-api/schema";

const valid = {
    check_in: "2026-12-28",
    check_out: "2026-12-30",
    room_type: "doble",
    adults: 2,
    children: 1,
    full_name: "Ana Pérez",
    email: "ana@example.com",
};

test("solicitud válida se acepta y se normaliza", () => {
    const r = ReservationRequestSchema.safeParse({
        ...valid,
        room_type: " DOBLE ",
        full_name: "  Ana    María   Pérez ",
        email: "  ANA@Example.COM ",
        phone: " +56   9 1234 5678 ",
        notes: "  llegamos\n tarde  ",
    });
    assert.ok(r.success);
    assert.equal(r.data.room_type, "doble");
    assert.equal(r.data.full_name, "Ana María Pérez");
    assert.equal(r.data.email, "ana@example.com");
    assert.equal(r.data.phone, "+56 9 1234 5678");
    assert.equal(r.data.notes, "llegamos tarde");
});

test("children es opcional (0 por defecto); phone y notes opcionales", () => {
    const { children, ...rest } = valid;
    void children;
    const r = ReservationRequestSchema.safeParse(rest);
    assert.ok(r.success);
    assert.equal(r.data.children, 0);
    assert.equal(r.data.phone, undefined);
});

test("rechaza campos desconocidos (modo estricto)", () => {
    const r = ReservationRequestSchema.safeParse({ ...valid, status: "confirmed" });
    assert.equal(r.success, false);
    if (!r.success) assert.deepEqual(issueFields(r.error), ["campos_desconocidos"]);
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, total_price: 1 }).success, false);
    assert.equal(AvailabilityQuerySchema.safeParse({ check_in: "2026-12-28", check_out: "2026-12-30", x: "1" }).success, false);
});

test("rechaza fechas mal formadas o imposibles", () => {
    for (const bad of ["28/12/2026", "2026-12-28T00:00:00Z", "2026-13-01", "2026-02-30", "", "hoy"]) {
        assert.equal(ReservationRequestSchema.safeParse({ ...valid, check_in: bad }).success, false, bad);
    }
    assert.equal(isRealDate("2028-02-29"), true);
    assert.equal(isRealDate("2027-02-29"), false);
});

test("check_out debe ser posterior a check_in", () => {
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, check_out: "2026-12-28" }).success, false);
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, check_out: "2026-12-27" }).success, false);
    assert.equal(AvailabilityQuerySchema.safeParse({ check_in: "2026-12-30", check_out: "2026-12-28" }).success, false);
});

test("adultos y niños fuera de rango", () => {
    for (const adults of [0, 7, -1, 1.5, "2"]) {
        assert.equal(ReservationRequestSchema.safeParse({ ...valid, adults }).success, false, String(adults));
    }
    for (const children of [-1, 7, 0.5]) {
        assert.equal(ReservationRequestSchema.safeParse({ ...valid, children }).success, false, String(children));
    }
    assert.ok(ReservationRequestSchema.safeParse({ ...valid, adults: 6, children: 6 }).success);
    assert.ok(ReservationRequestSchema.safeParse({ ...valid, adults: 1, children: 0 }).success);
});

test("email inválido o demasiado largo", () => {
    for (const email of ["", "sin-arroba", "a@b", "a b@example.com", `${"x".repeat(160)}@example.com`]) {
        assert.equal(ReservationRequestSchema.safeParse({ ...valid, email }).success, false, email);
    }
});

test("límites de largo: nombre 3-120, teléfono 30, notas 500, tipo válido", () => {
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, full_name: "Al" }).success, false);
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, full_name: "   A  " }).success, false); // normalizado = "A"
    assert.ok(ReservationRequestSchema.safeParse({ ...valid, full_name: "  A   l " }).success); // normalizado = "A l" (3)
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, full_name: "x".repeat(121) }).success, false);
    assert.ok(ReservationRequestSchema.safeParse({ ...valid, full_name: "x".repeat(120) }).success);
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, phone: "1".repeat(31) }).success, false);
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, notes: "n".repeat(501) }).success, false);
    assert.ok(ReservationRequestSchema.safeParse({ ...valid, notes: "n".repeat(500) }).success);
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, room_type: "suite" }).success, false);
    for (const t of ["matrimonial", "doble", "triple", "cuadruple"]) {
        assert.ok(ReservationRequestSchema.safeParse({ ...valid, room_type: t }).success, t);
    }
});

test("honeypot website se acepta en el esquema (la ruta lo trata antes)", () => {
    assert.ok(ReservationRequestSchema.safeParse({ ...valid, website: "" }).success);
});

test("disponibilidad: consulta válida y noches", () => {
    const r = AvailabilityQuerySchema.safeParse({ check_in: "2026-12-28", check_out: "2027-01-02" });
    assert.ok(r.success);
    assert.equal(nightsBetween("2026-12-28", "2027-01-02"), 5);
    assert.equal(AvailabilityQuerySchema.safeParse({ check_in: "2026-12-28" }).success, false);
});

test("idempotency_key es opcional, se normaliza y admite hasta 64 caracteres", () => {
    assert.equal(ReservationRequestSchema.safeParse(valid).data?.idempotency_key, undefined);
    const k = "a1b2c3d4-e5f6-4789-8abc-def012345678";
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, idempotency_key: ` ${k} ` }).data?.idempotency_key, k);
    assert.ok(ReservationRequestSchema.safeParse({ ...valid, idempotency_key: "k".repeat(64) }).success);
    assert.equal(ReservationRequestSchema.safeParse({ ...valid, idempotency_key: "k".repeat(65) }).success, false);
});
