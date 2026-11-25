// Enlace directo ?codigo= en la Lista de Reservas: lógica de rango/validez y resaltado en la lista.
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { parseCodigoParam, rangeForDeepLink, isPendingWebRequest } from "../src/lib/reservations/deeplink";

const fallback = { from: "2026-11-25", to: "2026-11-25" };
const pending = { code: "W1", check_in: "2026-12-10", check_out: "2026-12-12", status: "pending", source: "web" };

test("parseCodigoParam: vacío, múltiple o demasiado largo", () => {
    assert.equal(parseCodigoParam(undefined), null);
    assert.equal(parseCodigoParam("  "), null);
    assert.equal(parseCodigoParam(" W1 "), "W1");
    assert.equal(parseCodigoParam(["W1", "W2"]), "W1");
    assert.equal(parseCodigoParam("x".repeat(65)), null);
});

test("rangeForDeepLink: pendiente web sin rango propio => estadía de la reserva y resaltado", () => {
    assert.deepEqual(rangeForDeepLink(pending, undefined, undefined, fallback), { from: "2026-12-10", to: "2026-12-12", highlightCode: "W1" });
});

test("rangeForDeepLink: si la URL trae su propio rango, se respeta", () => {
    const fb = { from: "2026-12-01", to: "2026-12-31" };
    assert.deepEqual(rangeForDeepLink(pending, "2026-12-01", "2026-12-31", fb), { ...fb, highlightCode: "W1" });
});

test("rangeForDeepLink: código inexistente, ya confirmada/rechazada o no web => sin cambios ni resaltado", () => {
    const sin = { ...fallback, highlightCode: null };
    assert.deepEqual(rangeForDeepLink(null, undefined, undefined, fallback), sin);
    for (const status of ["confirmed", "rechazada", "cancelled"]) {
        assert.deepEqual(rangeForDeepLink({ ...pending, status }, undefined, undefined, fallback), sin);
    }
    assert.deepEqual(rangeForDeepLink({ ...pending, source: null }, undefined, undefined, fallback), sin);
    assert.equal(isPendingWebRequest(undefined), false);
});

before(() => {
    mock.module("next/navigation", { namedExports: { useRouter: () => ({ push() {}, refresh() {}, replace() {} }) } });
    mock.module(new URL("../src/components/reservations/ReservationFormModal.tsx", import.meta.url).href, {
        defaultExport: () => null,
    });
});

const res = (id: number, code: string, status: string) => ({
    id, code, status, source: "web", check_in: "2026-12-10", check_out: "2026-12-12", hold_expires_at: null, total_price: null,
    hostal_rooms: { name: "Doble 1" }, hostal_guests: { full_name: `Huésped ${id}` },
});

async function render(highlightCode: string | null | undefined, list: any[]) {
    const { default: ReservasList } = await import("../src/app/panel/reservas/ReservasList");
    return renderToString(createElement(ReservasList, {
        initialReservations: list, today: "2026-11-25", from: "2026-12-01", to: "2026-12-31", rooms: [], guests: [], highlightCode,
    } as any));
}

test("lista: resalta solo la tarjeta del código pendiente indicado", async () => {
    const html = await render("W2", [res(1, "W1", "pending"), res(2, "W2", "pending")]);
    assert.equal((html.match(/data-highlighted="true"/g) ?? []).length, 1);
    assert.match(html, /id="reserva-2"[^>]*data-highlighted="true"/);
    assert.ok(!/id="reserva-1"[^>]*data-highlighted/.test(html));
});

test("lista: sin parámetro, con código inexistente o ya no pendiente => no resalta nada y no falla", async () => {
    const list = [res(1, "W1", "pending"), res(2, "W2", "confirmed")];
    for (const code of [undefined, null, "NOEXISTE", "W2"]) {
        const html = await render(code, list);
        assert.ok(!html.includes("data-highlighted"), String(code));
        assert.ok(html.includes("Huésped 1"));
    }
});
