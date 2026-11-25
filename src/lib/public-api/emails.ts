// Correos de la API pública (Resend). Solo se envían si PUBLIC_API_SEND_EMAILS === "true".
// Un fallo de envío nunca debe hacer fallar la solicitud.

import { getAppBaseUrl } from "../config/appUrl";
import { formatDMY, formatSantiagoFull } from "./format";

const FROM = "Hostal Loreto Belén <reservas@loretobelen.cl>";
const REPLY_TO = "reservas@loretobelen.cl";
const DEFAULT_NOTIFY = "reservas@loretobelen.cl";

const ROOM_LABELS: Record<string, string> = {
    matrimonial: "Matrimonial",
    doble: "Doble",
    triple: "Triple",
    cuadruple: "Cuádruple",
};

export type RequestEmailData = {
    code: string;
    check_in: string; // YYYY-MM-DD
    check_out: string; // YYYY-MM-DD
    room_type: string;
    adults: number;
    children: number;
    full_name: string;
    email: string;
    phone?: string | null;
    notes?: string | null;
    hold_expires_at: string; // ISO
};

export function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function peopleLabel(adults: number, children: number): string {
    const a = `${adults} ${adults === 1 ? "adulto" : "adultos"}`;
    return children > 0 ? `${a} y ${children} ${children === 1 ? "niño" : "niños"}` : a;
}

function roomLabel(type: string): string {
    return ROOM_LABELS[String(type ?? "").toLowerCase()] ?? type;
}

function layout(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
          <tr><td style="padding:16px 24px;background:#111827;color:#f9fafb;font-size:18px;font-weight:600;">Hostal Loreto Belén</td></tr>
          <tr><td style="padding:20px 24px 8px 24px;color:#111827;font-size:18px;font-weight:600;">${title}</td></tr>
          <tr><td style="padding:0 24px 24px 24px;color:#374151;font-size:14px;line-height:1.6;">${body}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** (a) Correo al huésped: sin precios. */
export function buildGuestEmail(d: RequestEmailData): { subject: string; html: string } {
    const hold = formatSantiagoFull(d.hold_expires_at);
    const html = layout(
        "Hemos recibido su solicitud de reserva",
        `Estimado/a <strong>${escapeHtml(d.full_name)}</strong>,<br><br>
Hemos recibido su solicitud de reserva.<br><br>
<strong>Código:</strong> ${escapeHtml(d.code)}<br>
<strong>Entrada:</strong> ${escapeHtml(formatDMY(d.check_in))}<br>
<strong>Salida:</strong> ${escapeHtml(formatDMY(d.check_out))}<br>
<strong>Tipo de habitación:</strong> ${escapeHtml(roomLabel(d.room_type))}<br>
<strong>Personas:</strong> ${escapeHtml(peopleLabel(d.adults, d.children))}<br><br>
Su solicitud queda pendiente de confirmación por nuestra recepción. Mantendremos la reserva provisoria hasta el ${escapeHtml(hold)}.<br><br>
Saludos,<br>
<strong>Hostal Loreto Belén</strong>`
    );
    return { subject: `Hemos recibido su solicitud de reserva (${d.code})`, html };
}

/** Enlace al panel que abre la Lista de Reservas en esta solicitud (exige iniciar sesión; no aprueba nada). */
export function staffRequestLink(code: string): string {
    return `${getAppBaseUrl()}/panel/reservas?codigo=${encodeURIComponent(code)}`;
}

/** (b) Correo interno a recepción: todos los datos de la solicitud. */
export function buildStaffEmail(d: RequestEmailData): { subject: string; html: string } {
    const row = (label: string, value: unknown) =>
        `<strong>${label}:</strong> ${escapeHtml(value) || "—"}<br>`;
    const html = layout(
        `Nueva solicitud de reserva web ${escapeHtml(d.code)}`,
        [
            row("Código", d.code),
            row("Entrada", formatDMY(d.check_in)),
            row("Salida", formatDMY(d.check_out)),
            row("Tipo de habitación", roomLabel(d.room_type)),
            row("Adultos", d.adults),
            row("Niños", d.children),
            row("Nombre", d.full_name),
            row("Email", d.email),
            row("Teléfono", d.phone),
            row("Notas", d.notes),
            row("Reserva provisoria hasta", formatSantiagoFull(d.hold_expires_at)),
            `<br><a href="${escapeHtml(staffRequestLink(d.code))}" style="display:inline-block;padding:10px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Ver solicitud en el panel</a>`,
        ].join("\n")
    );
    return { subject: `Nueva solicitud de reserva web ${d.code}`, html };
}

export type ConfirmationEmailData = Omit<RequestEmailData, "hold_expires_at" | "phone" | "notes">;

/** (c) Correo al huésped cuando recepción confirma una solicitud web: sin precios. */
export function buildConfirmationEmail(d: ConfirmationEmailData): { subject: string; html: string } {
    const html = layout(
        "Su reserva ha sido confirmada",
        `Estimado/a <strong>${escapeHtml(d.full_name)}</strong>,<br><br>
Nos alegra informarle que su reserva ha sido confirmada.<br><br>
<strong>Código:</strong> ${escapeHtml(d.code)}<br>
<strong>Entrada:</strong> ${escapeHtml(formatDMY(d.check_in))}<br>
<strong>Salida:</strong> ${escapeHtml(formatDMY(d.check_out))}<br>
<strong>Tipo de habitación:</strong> ${escapeHtml(roomLabel(d.room_type))}<br>
<strong>Personas:</strong> ${escapeHtml(peopleLabel(d.adults, d.children))}<br><br>
Le esperamos.<br><br>
Saludos,<br>
<strong>Hostal Loreto Belén</strong>`
    );
    return { subject: `Su reserva ha sido confirmada (${d.code})`, html };
}

export function emailsEnabled(env: Record<string, string | undefined> = process.env): boolean {
    return env.PUBLIC_API_SEND_EMAILS === "true";
}

/**
 * Envía los dos correos si están habilitados. Nunca lanza: registra el error en el servidor
 * (sin datos personales) y sigue.
 */
export async function sendRequestEmails(d: RequestEmailData): Promise<void> {
    if (!emailsEnabled()) return;

    try {
        if (!process.env.RESEND_API_KEY) {
            console.error("[public-api] Correos habilitados pero falta RESEND_API_KEY.");
            return;
        }
        const { resend } = await import("../email/resendClient");
        const notifyTo = process.env.PUBLIC_API_NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY;

        const guest = buildGuestEmail(d);
        const staff = buildStaffEmail(d);

        const results = await Promise.allSettled([
            resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: [d.email], subject: guest.subject, html: guest.html }),
            resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: [notifyTo], subject: staff.subject, html: staff.html }),
        ]);

        results.forEach((r, i) => {
            const which = i === 0 ? "huésped" : "recepción";
            if (r.status === "rejected") {
                console.error(`[public-api] Falló el envío del correo a ${which}.`);
            } else if (r.value?.error) {
                console.error(`[public-api] Resend rechazó el correo a ${which}: ${r.value.error.name ?? "error"}.`);
            }
        });
    } catch {
        console.error("[public-api] Error inesperado enviando correos.");
    }
}

/**
 * Envía al huésped el correo de confirmación (mismo interruptor, proveedor y remitente que los demás).
 * Nunca lanza: un fallo de envío no debe afectar el cambio de estado. Devuelve true si Resend aceptó el correo.
 */
export async function sendConfirmationEmail(d: ConfirmationEmailData): Promise<boolean> {
    if (!emailsEnabled()) return false;

    try {
        if (!process.env.RESEND_API_KEY) {
            console.error("[public-api] Correos habilitados pero falta RESEND_API_KEY.");
            return false;
        }
        const { resend } = await import("../email/resendClient");
        const guest = buildConfirmationEmail(d);

        const [r] = await Promise.allSettled([
            resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: [d.email], subject: guest.subject, html: guest.html }),
        ]);

        if (r.status === "rejected") {
            console.error("[public-api] Falló el envío del correo de confirmación al huésped.");
            return false;
        }
        if (r.value?.error) {
            console.error(`[public-api] Resend rechazó el correo de confirmación: ${r.value.error.name ?? "error"}.`);
            return false;
        }
        return true;
    } catch {
        console.error("[public-api] Error inesperado enviando el correo de confirmación.");
        return false;
    }
}
