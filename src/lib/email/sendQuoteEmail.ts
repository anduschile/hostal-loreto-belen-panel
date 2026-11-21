import { Resend } from "resend";
import type { SendEmailParams } from "../quotes/service";

// Mismo remitente que el voucher (sendReservationVoucherEmail.ts).
export const QUOTE_FROM = "Hostal Loreto Belén <reservas@loretobelen.cl>";
export const QUOTE_REPLY_TO = "reservas@loretobelen.cl";

/** Seguro por defecto: solo envía de verdad con QUOTES_EMAIL_MODE=live. */
export function isQuoteEmailLive() {
    return process.env.QUOTES_EMAIL_MODE === "live";
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function buildQuoteEmail({ toEmail, contactName, code, pdfBuffer }: SendEmailParams) {
    return {
        from: QUOTE_FROM,
        replyTo: QUOTE_REPLY_TO,
        to: [toEmail],
        subject: `Cotización Hostal Loreto Belén (${code})`,
        html: `<!DOCTYPE html>
<html lang="es"><body style="margin:0;padding:24px;background-color:#f3f4f6;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <tr><td style="padding:16px 24px;background-color:#111827;color:#f9fafb;font-size:18px;font-weight:600;">Hostal Loreto Belén</td></tr>
    <tr><td style="padding:20px 24px 8px 24px;color:#111827;font-size:18px;font-weight:600;">Cotización ${esc(code)}</td></tr>
    <tr><td style="padding:0 24px 16px 24px;color:#4b5563;font-size:14px;line-height:1.6;">
      Estimado/a <strong>${esc(contactName || "cliente")}</strong>,<br><br>
      Adjuntamos la cotización solicitada. El detalle de fechas, habitaciones y montos está en el PDF adjunto.
    </td></tr>
    <tr><td style="padding:0 24px 24px 24px;color:#6b7280;font-size:13px;line-height:1.6;">
      Ante cualquier duda, puede responder directamente a este correo.<br><br>
      Saludos,<br><strong>Hostal Loreto Belén</strong>
    </td></tr>
    <tr><td style="padding:12px 24px;background-color:#f9fafb;color:#9ca3af;font-size:11px;text-align:center;border-top:1px solid #e5e7eb;">Hostal Loreto Belén · Puerto Natales, Chile</td></tr>
  </table>
</body></html>`,
        attachments: [{ filename: `cotizacion_${code}.pdf`, content: pdfBuffer }],
    };
}

export async function sendQuoteEmail(params: SendEmailParams): Promise<{ simulated: boolean }> {
    const payload = buildQuoteEmail(params);

    if (!isQuoteEmailLive()) {
        console.log("[cotizador] MODO SIMULADO: correo NO enviado", {
            to: payload.to,
            subject: payload.subject,
            attachment: payload.attachments[0].filename,
            bytes: params.pdfBuffer.length,
        });
        return { simulated: true };
    }

    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY no está definida.");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send(payload);
    if (error) throw new Error(`Error enviando email: ${error.message}`);
    return { simulated: false };
}
