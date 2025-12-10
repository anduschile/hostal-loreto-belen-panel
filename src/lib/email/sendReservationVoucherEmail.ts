
import { resend } from "./resendClient";

type SendVoucherParams = {
  toEmail: string;
  guestName?: string;
  publicCode: string;
  pdfBuffer: Buffer;
};

export async function sendReservationVoucherEmail({
  toEmail,
  guestName,
  publicCode,
  pdfBuffer,
}: SendVoucherParams) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY no está definida. Por favor agréguela a las variables de entorno."
    );
  }

  const { data, error } = await resend.emails.send({
    from: "Hostal Loreto Belén <reservas@loretobelen.cl>",
    replyTo: "reservas@loretobelen.cl",
    to: [toEmail],
    subject: `Voucher de Reserva - Hostal Loreto Belén (${publicCode})`,
    html: `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:16px 24px;background-color:#111827;color:#f9fafb;font-size:18px;font-weight:600;">
                Hostal Loreto Belén
              </td>
            </tr>

            <tr>
              <td style="padding:20px 24px 8px 24px;color:#111827;font-size:18px;font-weight:600;">
                Voucher de Reserva – ${publicCode}
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 16px 24px;color:#4b5563;font-size:14px;line-height:1.6;">
                Estimado/a <strong>${guestName ?? "Huésped"}</strong>,<br><br>
                Adjuntamos el voucher de su reserva en <strong>Hostal Loreto Belén</strong>.
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 24px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;">
                  <tr>
                    <td style="padding:10px 12px;background-color:#f9fafb;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;border-bottom:1px solid #e5e7eb;">
                      Detalle de la reserva
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 12px 4px 12px;color:#374151;font-size:14px;">
                      <strong>Código:</strong> ${publicCode}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 12px 12px 12px;color:#374151;font-size:14px;">
                      <strong>Huésped:</strong> ${guestName ?? "Huésped"}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;background-color:#f9fafb;color:#111827;font-size:14px;font-weight:600;border-top:1px solid #e5e7eb;">
                      El detalle completo de fechas, habitación y montos se encuentra en el PDF adjunto.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 16px 24px;color:#4b5563;font-size:14px;line-height:1.6;">
                El detalle completo de la reserva se encuentra en el
                archivo PDF adjunto a este correo.
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 24px 24px 24px;">
                <a href="#" style="display:inline-block;padding:10px 18px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:9999px;font-size:14px;font-weight:600;">
                  Descargar voucher (PDF)
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 24px 24px;color:#6b7280;font-size:13px;line-height:1.6;">
                Ante cualquier duda, puedes responder directamente a este correo
                o escribirnos a nuestro canal de reservas.<br><br>
                Saludos cordiales,<br>
                <strong>Hostal Loreto Belén</strong>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 24px;background-color:#f9fafb;color:#9ca3af;font-size:11px;text-align:center;border-top:1px solid #e5e7eb;">
                Hostal Loreto Belén · Puerto Natales, Chile<br>
                Este es un correo automático generado por el sistema de reservas.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
    attachments: [
      {
        filename: `voucher_${publicCode}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    console.error("Error enviando email con Resend:", error);
    throw new Error(`Error enviando email: ${error.message}`);
  }

  return data;
}
