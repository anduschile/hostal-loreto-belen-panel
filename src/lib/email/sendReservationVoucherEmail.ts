
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
        from: "Hostal Loreto Belén <noreply@resend.dev>",
        replyTo: "reservas@loretobelen.cl",
        to: [toEmail],
        subject: `Voucher de Reserva - Hostal Loreto Belén (${publicCode})`,
        html: `
      <div style="font-family: sans-serif; font-size: 16px; color: #333;">
        <p>Estimado/a ${guestName || "Huésped"},</p>
        <p>Adjuntamos el voucher de su reserva en <strong>Hostal Loreto Belén</strong>.</p>
        <p>Ante cualquier duda, puedes responder directamente a este correo.</p>
        <p style="margin-top: 20px;">Saludos cordiales,<br/>Hostal Loreto Belén</p>
      </div>
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
