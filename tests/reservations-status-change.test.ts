// Confirmar / rechazar solicitudes web: estado "rechazada", limpieza del hold y correo de confirmación (todo simulado).
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { reservationStatusSchema } from "../src/lib/validators/reservation-status";
import { blocksRoom, findOverlaps, IGNORED_STATUSES, shouldValidateOverlap } from "../src/lib/reservations/overlap";
import {
    buildStatusUpdatePayload,
    loadConfirmationData,
    notifyConfirmation,
    planStatusChange,
} from "../src/lib/reservations/statusChange";
import { buildConfirmationEmail, sendConfirmationEmail } from "../src/lib/public-api/emails";

// ---- estado "rechazada" ----------------------------------------------------

test('el endpoint de estado acepta "rechazada" y sigue rechazando valores inventados', () => {
    assert.equal(reservationStatusSchema.safeParse({ status: "rechazada" }).success, true);
    assert.equal(reservationStatusSchema.safeParse({ status: "confirmed" }).success, true);
    assert.equal(reservationStatusSchema.safeParse({ status: "rechazado" }).success, false);
});

test('overlap/guardOverlap: "rechazada" no ocupa la habitación (igual que cancelled)', () => {
    assert.ok((IGNORED_STATUSES as readonly string[]).includes("rechazada"));
    const base = { room_id: 10, fulfillment_type: "INTERNAL", check_in: "2026-12-27", check_out: "2026-12-30" };
    assert.equal(blocksRoom({ ...base, status: "rechazada" }), false);
    // rechazar nunca se valida
    assert.equal(shouldValidateOverlap({ ...base, status: "pending" }, { ...base, status: "rechazada" }), false);
    // una rechazada no genera conflicto con una nueva reserva en las mismas fechas
    const rows = [
        { id: 1, ...base, status: "rechazada" },
        { id: 2, ...base, status: "cancelled" },
        { id: 3, ...base, status: "pending" },
    ];
    const found = findOverlaps(rows, { room_id: 10, check_in: "2026-12-28", check_out: "2026-12-29" });
    assert.deepEqual(found.map((r) => r.id), [3]);
    // volver a confirmar una rechazada sí se valida
    assert.equal(shouldValidateOverlap({ ...base, status: "rechazada" }, { ...base, status: "confirmed" }), true);
});

// ---- plan y payload ---------------------------------------------------------

test("confirmar una solicitud web pendiente: limpia el hold y envía correo", () => {
    assert.deepEqual(planStatusChange({ status: "pending", source: "web" }, "confirmed"), { clearHold: true, sendConfirmation: true });
});

test("confirmar de nuevo una ya confirmada no reenvía el correo", () => {
    assert.deepEqual(planStatusChange({ status: "confirmed", source: "web" }, "confirmed"), { clearHold: true, sendConfirmation: false });
});

test("confirmar una reserva que no es web: sin cambios extra ni correo", () => {
    assert.deepEqual(planStatusChange({ status: "pending", source: "manual" }, "confirmed"), { clearHold: false, sendConfirmation: false });
    assert.deepEqual(planStatusChange({ status: "pending", source: null }, "confirmed"), { clearHold: false, sendConfirmation: false });
});

test("rechazar: limpia el hold y NO envía correo", () => {
    assert.deepEqual(planStatusChange({ status: "pending", source: "web" }, "rechazada"), { clearHold: true, sendConfirmation: false });
});

test("otros estados no tocan el hold ni envían correo", () => {
    for (const s of ["pending", "checked_in", "checked_out", "cancelled", "blocked"]) {
        assert.deepEqual(planStatusChange({ status: "pending", source: "web" }, s), { clearHold: false, sendConfirmation: false }, s);
    }
});

test("el UPDATE incluye hold_expires_at = null al confirmar y al rechazar, y no en otros casos", () => {
    const web = { status: "pending", source: "web" };
    const conf = buildStatusUpdatePayload("confirmed", planStatusChange(web, "confirmed"));
    assert.deepEqual(conf, { status: "confirmed", hold_expires_at: null });

    const rech = buildStatusUpdatePayload("rechazada", planStatusChange(web, "rechazada"));
    assert.deepEqual(rech, { status: "rechazada", hold_expires_at: null });

    const cancel = buildStatusUpdatePayload("cancelled", planStatusChange(web, "cancelled"));
    assert.deepEqual(cancel, { status: "cancelled" });
    assert.ok(!("hold_expires_at" in cancel));

    // conserva la nota de solapamiento autorizado
    assert.deepEqual(buildStatusUpdatePayload("confirmed", planStatusChange(web, "confirmed"), "nota"), {
        status: "confirmed",
        notes: "nota",
        hold_expires_at: null,
    });
});

// ---- correo de confirmación -------------------------------------------------

const row = {
    code: "W20261128101500123",
    check_in: "2026-12-28",
    check_out: "2026-12-30",
    adults: 2,
    children: 1,
    hostal_rooms: { room_type: "doble" },
    hostal_guests: { full_name: "Ana Pérez", email: "ana@example.com" },
};
const fakeDb = (data: any, error: any = null) => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error }) }) }) }),
});

test("contenido del correo de confirmación: asunto, datos pedidos y sin precios", () => {
    const { subject, html } = buildConfirmationEmail({
        code: "LB-00123",
        check_in: "2026-12-28",
        check_out: "2026-12-30",
        room_type: "doble",
        adults: 2,
        children: 1,
        full_name: "Ana <b>x</b>",
        email: "ana@example.com",
    });
    assert.equal(subject, "Su reserva ha sido confirmada (LB-00123)");
    for (const s of ["LB-00123", "28/12/2026", "30/12/2026", "Doble", "2 adultos y 1 niño", "Hostal Loreto Belén"]) {
        assert.ok(html.includes(s), s);
    }
    assert.ok(!/\$|precio|tarifa/i.test(html));
    assert.ok(!html.includes("<b>x</b>") && html.includes("&lt;b&gt;"));
    // tipo en mayúsculas (la hab. 1 está guardada como MATRIMONIAL)
    const upper = buildConfirmationEmail({
        code: "A", check_in: "2026-12-28", check_out: "2026-12-30", room_type: "MATRIMONIAL",
        adults: 1, children: 0, full_name: "x", email: "a@b.cl",
    });
    assert.ok(upper.html.includes("Matrimonial"));
});

test("confirmar dispara el envío con los datos de la reserva (envío simulado)", async () => {
    const send = mock.fn(async (_d: any) => true);
    const ok = await notifyConfirmation(fakeDb(row) as any, 7, send);
    assert.equal(ok, true);
    assert.equal(send.mock.callCount(), 1);
    assert.deepEqual(send.mock.calls[0].arguments[0], {
        code: "W20261128101500123",
        check_in: "2026-12-28",
        check_out: "2026-12-30",
        room_type: "doble",
        adults: 2,
        children: 1,
        full_name: "Ana Pérez",
        email: "ana@example.com",
    });
});

test("si el correo falla (rechaza o lanza) no se propaga el error", async () => {
    const throwing = async () => {
        throw new Error("boom");
    };
    assert.equal(await notifyConfirmation(fakeDb(row) as any, 7, throwing as any), false);
    assert.equal(await notifyConfirmation(fakeDb(row) as any, 7, async () => false), false);
});

test("sin email del huésped o sin reserva: no se envía nada", async () => {
    const send = mock.fn(async (_d: any) => true);
    assert.equal(await notifyConfirmation(fakeDb({ ...row, hostal_guests: { full_name: "Ana", email: " " } }) as any, 7, send), false);
    assert.equal(await notifyConfirmation(fakeDb(null) as any, 7, send), false);
    assert.equal(await notifyConfirmation(fakeDb(null, { message: "x" }) as any, 7, send), false);
    assert.equal(send.mock.callCount(), 0);
    // la relación puede venir como arreglo
    const d = await loadConfirmationData(fakeDb({ ...row, hostal_guests: [{ full_name: "Ana", email: "a@b.cl" }] }) as any, 1);
    assert.equal(d?.email, "a@b.cl");
});

test("rechazar no envía correo (el plan no lo pide, así que el envío simulado no se invoca)", async () => {
    const send = mock.fn(async (_d: any) => true);
    const plan = planStatusChange({ status: "pending", source: "web" }, "rechazada");
    if (plan.sendConfirmation) await notifyConfirmation(fakeDb(row) as any, 7, send);
    assert.equal(send.mock.callCount(), 0);
});

test('sendConfirmationEmail no hace nada (ni lanza) si PUBLIC_API_SEND_EMAILS no es "true"', async () => {
    const prev = process.env.PUBLIC_API_SEND_EMAILS;
    delete process.env.PUBLIC_API_SEND_EMAILS;
    const r = await sendConfirmationEmail({
        code: "A", check_in: "2026-12-28", check_out: "2026-12-30", room_type: "doble",
        adults: 1, children: 0, full_name: "x", email: "a@b.cl",
    });
    assert.equal(r, false);
    if (prev !== undefined) process.env.PUBLIC_API_SEND_EMAILS = prev;
});
