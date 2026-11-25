// Correos y formatos de la API pública (sin llamadas reales a Resend).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGuestEmail, buildStaffEmail, escapeHtml, emailsEnabled, peopleLabel, sendRequestEmails } from "../src/lib/public-api/emails";
import { formatSantiagoFull, formatSantiagoShort, formatDMY } from "../src/lib/public-api/format";

const data = {
    code: "LB-00123",
    check_in: "2026-12-28",
    check_out: "2026-12-30",
    room_type: "doble",
    adults: 2,
    children: 1,
    full_name: 'Ana <script>alert("x")</script>',
    email: "ana@example.com",
    phone: "+56 9 1234 5678",
    notes: "<img src=x onerror=alert(1)> & más",
    hold_expires_at: "2026-12-02T15:30:00Z", // verano en Santiago: UTC-3 => 12:30
};

test("formato en hora de Santiago (verano UTC-3 e invierno UTC-4)", () => {
    assert.equal(formatSantiagoFull("2026-12-02T15:30:00Z"), "02/12/2026 12:30");
    assert.equal(formatSantiagoShort("2026-12-02T15:30:00Z"), "02/12 12:30");
    assert.equal(formatSantiagoFull("2026-07-02T15:30:00Z"), "02/07/2026 11:30");
    assert.equal(formatSantiagoFull("no-es-fecha"), "");
    assert.equal(formatDMY("2026-12-28"), "28/12/2026");
});

test("correo al huésped: contenido pedido, sin precios y con todo escapado", () => {
    const { subject, html } = buildGuestEmail(data);
    assert.match(subject, /Hemos recibido su solicitud de reserva/);
    assert.ok(html.includes("LB-00123"));
    assert.ok(html.includes("28/12/2026") && html.includes("30/12/2026"));
    assert.ok(html.includes("Doble"));
    assert.ok(html.includes("2 adultos y 1 niño"));
    assert.ok(html.includes("Su solicitud queda pendiente de confirmación por nuestra recepción. Mantendremos la reserva provisoria hasta el 02/12/2026 12:30"));
    assert.ok(html.includes("Saludos,"));
    assert.ok(html.includes("Hostal Loreto Belén"));
    assert.ok(!/\$|precio|tarifa/i.test(html));
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
});

test("correo a recepción: todos los datos y texto del usuario escapado", () => {
    const { subject, html } = buildStaffEmail(data);
    assert.ok(subject.includes("LB-00123"));
    for (const s of ["LB-00123", "ana@example.com", "+56 9 1234 5678", "28/12/2026", "Doble"]) {
        assert.ok(html.includes(s), s);
    }
    assert.ok(!html.includes("<img"));
    assert.ok(html.includes("&lt;img"));
    assert.ok(html.includes("&amp; más"));
});

test("escapeHtml y etiquetas de personas", () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
    assert.equal(peopleLabel(1, 0), "1 adulto");
    assert.equal(peopleLabel(3, 2), "3 adultos y 2 niños");
});

test("los correos solo se envían si PUBLIC_API_SEND_EMAILS vale exactamente \"true\"", async () => {
    assert.equal(emailsEnabled({}), false);
    for (const v of ["True", "TRUE", "1", "yes", "false", " true", ""]) {
        assert.equal(emailsEnabled({ PUBLIC_API_SEND_EMAILS: v }), false, v);
    }
    assert.equal(emailsEnabled({ PUBLIC_API_SEND_EMAILS: "true" }), true);

    // Deshabilitado: no hace nada ni lanza (no se llama a Resend).
    const prev = process.env.PUBLIC_API_SEND_EMAILS;
    delete process.env.PUBLIC_API_SEND_EMAILS;
    await sendRequestEmails(data);
    if (prev !== undefined) process.env.PUBLIC_API_SEND_EMAILS = prev;
});

test("correo a recepción: enlace directo al panel con el código de la reserva", () => {
    const saved = { app: process.env.NEXT_PUBLIC_APP_URL };
    process.env.NEXT_PUBLIC_APP_URL = "https://panel.example.cl/";
    try {
        const { html } = buildStaffEmail({ ...data, code: "W20261210120000123" });
        assert.ok(html.includes('href="https://panel.example.cl/panel/reservas?codigo=W20261210120000123"'));
        assert.ok(html.includes("Ver solicitud en el panel"));
        // un código con caracteres especiales no puede romper el atributo ni inyectar HTML
        const raro = buildStaffEmail({ ...data, code: 'A"><b>&x' }).html;
        assert.ok(!raro.includes('"><b>'));
        assert.ok(raro.includes("codigo=A%22%3E%3Cb%3E%26x"));
        // el correo al huésped no lleva el enlace del panel
        assert.ok(!buildGuestEmail(data).html.includes("/panel/reservas"));
    } finally {
        if (saved.app === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = saved.app;
    }
});
