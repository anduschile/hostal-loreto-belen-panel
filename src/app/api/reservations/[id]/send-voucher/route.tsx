
import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { ReservationVoucher } from "@/lib/pdf/ReservationVoucher";
import { getReservationById } from "@/lib/data/reservations";
import { sendEmail } from "@/lib/email/emailService";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = "force-dynamic";

// Helper: Stream to Buffer
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

// Helper: Currency
const formatCurrency = (amount: number) => {
    return "$" + amount.toLocaleString("es-CL");
};

// Helper: Public Code
const formatPublicReservationCode = (reservation: { id?: number | string | null; code?: string }) => {
    if (reservation.id != null) {
        const n = Number(reservation.id);
        if (!Number.isNaN(n) && n > 0) {
            const padded = n.toString().padStart(5, "0");
            return `LB-${padded}`;
        }
    }
    return reservation.code || `Reserva #${reservation.id}`;
};

export async function POST(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = Number(params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return NextResponse.json({ ok: false, error: "ID de reserva inválido" }, { status: 400 });
        }

        const reservation = await getReservationById(id);
        if (!reservation) {
            return NextResponse.json({ ok: false, error: "Reserva no encontrada" }, { status: 404 });
        }

        const guest = reservation.hostal_guests || {};
        const room = reservation.hostal_rooms || {};
        const guestEmail = guest.email;

        if (!guestEmail) {
            return NextResponse.json({ ok: false, error: "El huésped no tiene email registrado" }, { status: 400 });
        }

        // 1. Generate PDF Buffer
        const pdfElement = ReservationVoucher({ reservation });
        const stream = await renderToStream(pdfElement);
        const pdfBuffer = await streamToBuffer(stream);

        // 2. Prepare Data for Email Template
        const publicCode = formatPublicReservationCode(reservation);
        const guestName = guest.full_name || "Huésped";
        const checkIn = format(new Date(reservation.check_in + "T00:00:00"), "dd 'de' MMMM, yyyy", { locale: es });
        const checkOut = format(new Date(reservation.check_out + "T00:00:00"), "dd 'de' MMMM, yyyy", { locale: es });
        const roomName = room.name ? `${room.name} (${room.room_type || "Estándar"})` : "";
        const companyName = reservation.hostal_companies?.name || "";
        const totalFormatted = (reservation.total_price > 0) ? formatCurrency(reservation.total_price) : null;

        // 3. Build HTML
        const htmlContent = `
<body style="margin:0;padding:0;background-color:#f5f5f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
               style="background-color:#ffffff;border-radius:16px;padding:32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
          <tr>
            <td>
              <p style="font-size:16px;margin:0 0 16px 0;">Hola, ${guestName}:</p>

              <p style="font-size:14px;line-height:1.6;margin:0 0 12px 0;">
                Gracias por reservar en <strong>Hostal Loreto Belén</strong>. Adjuntamos la ficha en PDF con todos los detalles de tu reserva.
              </p>

              <p style="font-size:14px;line-height:1.6;margin:0 0 12px 0;">
                <strong>Resumen de tu reserva:</strong><br/>
                Código: <strong>${publicCode}</strong><br/>
                Fechas: ${checkIn} – ${checkOut}<br/>
                Huésped: ${guestName}<br/>
                ${companyName ? `Empresa: ${companyName}<br/>` : ""}
                ${roomName ? `Habitación: ${roomName}` : ""}
              </p>

              ${totalFormatted ? `
              <p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;">
                Total estimado de la reserva: <strong>${totalFormatted} CLP</strong>
              </p>` : ""}

              <p style="font-size:14px;line-height:1.6;margin:0 0 24px 0;">
                Condiciones principales:<br/>
                • Habitaciones con baño privado.<br/>
                • Desayuno incluido.<br/>
                • Estacionamiento privado sin costo, sujeto a disponibilidad.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <td>
                    <a href="mailto:reservas@loretobelen.cl"
                       style="display:inline-block;background-color:#1d4ed8;color:#ffffff;padding:10px 20px;
                              border-radius:999px;font-size:14px;text-decoration:none;font-weight:600;">
                      Escribir a reservas
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px;color:#6b7280;margin:0;">
                Hostal Loreto Belén<br/>
                Yungay 551, Puerto Natales, Chile<br/>
                Tel: (61) 2 413285
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
        `;

        // 4. Send Email
        await sendEmail({
            to: guestEmail,
            subject: `Confirmación de Reserva ${publicCode} - Hostal Loreto Belén`,
            html: htmlContent,
            attachments: [
                {
                    filename: `${publicCode}.pdf`,
                    content: pdfBuffer,
                },
            ],
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Error enviando voucher:", error);
        return NextResponse.json({ ok: false, error: error.message || "Error interno" }, { status: 500 });
    }
}
