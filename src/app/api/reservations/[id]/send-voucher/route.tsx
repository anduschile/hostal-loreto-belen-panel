import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/email/resendClient"; // AJUSTA la ruta si en tu proyecto es otra
import { getReservationById } from "@/lib/data/reservations";
import { generateReservationVoucherPdfBuffer } from "@/lib/pdf/generateReservationVoucherPdf";
import { formatPublicReservationCode } from "@/lib/reservations/formatPublicReservationCode";

type Guest = {
  email?: string | null;
  full_name?: string | null;
};

type Company = {
  name?: string | null;
  contact_email?: string | null;
  email?: string | null;
};

type Room = {
  name?: string | null;
};

function formatDateEs(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCurrencyClp(amount: number | null | undefined) {
  if (amount == null || amount <= 0) return null;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1) ID de la reserva
    const idNum = Number(params.id);
    if (!idNum || Number.isNaN(idNum)) {
      return NextResponse.json(
        { ok: false, error: "ID de reserva inválido" },
        { status: 400 }
      );
    }

    // 2) Traer reserva (usa el mismo helper que el módulo actual)
    const reservation: any = await getReservationById(idNum);

    if (!reservation) {
      return NextResponse.json(
        { ok: false, error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // 3) Relaciones: huésped / empresa / habitación
    const guest = (reservation.hostal_guests ?? null) as Guest | null;
    const company = (reservation.hostal_companies ?? null) as Company | null;
    const room = (reservation.hostal_rooms ?? null) as Room | null;

    const guestEmail: string | null = guest?.email ?? null;

    if (!guestEmail) {
      return NextResponse.json(
        { ok: false, error: "El huésped no tiene email registrado" },
        { status: 400 }
      );
    }

    const companyEmail: string | null =
      company?.contact_email ?? company?.email ?? null;

    const publicCode = formatPublicReservationCode({
      id: reservation.id,
      code: reservation.code,
    });

    const total =
      reservation.total_price != null
        ? Number(reservation.total_price)
        : reservation.amount_total != null
          ? Number(reservation.amount_total)
          : null;

    const totalFormatted = formatCurrencyClp(total);

    // 4) Generar PDF (Buffer) usando el helper que ya tengas
    const pdfBuffer = await generateReservationVoucherPdfBuffer(reservation.id);

    // 5) HTML del correo
    const html = buildEmailHtml({
      publicCode,
      guestName: reservation.guest_name || guest?.full_name || "estimado/a",
      companyName: reservation.company_name_snapshot || company?.name || null,
      roomName: reservation.room_name || room?.name || null,
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      totalFormatted,
    });

    // 6) Enviar correo con Resend
    const fromAddress =
      process.env.RESEND_FROM ||
      process.env.SMTP_FROM ||
      "reservas@loretobelen.cl";

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: guestEmail,
      cc: companyEmail || undefined,
      subject: `Confirmación de reserva - Hostal Loreto Belén ${publicCode}`,
      html,
      attachments: [
        {
          filename: `Reserva-${publicCode}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error("Error enviando correo de reserva:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo enviar el correo. Intenta nuevamente más tarde.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error en /send-voucher:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          typeof err?.message === "string"
            ? err.message
            : "Error inesperado al enviar el correo",
      },
      { status: 500 }
    );
  }
}

function buildEmailHtml(args: {
  publicCode: string;
  guestName: string;
  companyName: string | null;
  roomName: string | null;
  checkIn: string;
  checkOut: string;
  totalFormatted: string | null;
}) {
  const {
    publicCode,
    guestName,
    companyName,
    roomName,
    checkIn,
    checkOut,
    totalFormatted,
  } = args;

  const fechas = `${formatDateEs(checkIn)} – ${formatDateEs(checkOut)}`;

  const empresaLinea = companyName ? `Empresa: ${companyName}<br/>` : "";
  const habitacionLinea = roomName ? `Habitación: ${roomName}<br/>` : "";
  const totalLinea = totalFormatted
    ? `<p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;">
         Total estimado de la reserva: <strong>${totalFormatted}</strong>
       </p>`
    : "";

  return `
  <body style="margin:0;padding:0;background-color:#f5f5f7;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0"
                 style="background-color:#ffffff;border-radius:16px;padding:32px;
                        font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
            <tr>
              <td>
                <p style="font-size:16px;margin:0 0 16px 0;">Hola, ${guestName}:</p>

                <p style="font-size:14px;line-height:1.6;margin:0 0 12px 0;">
                  Gracias por reservar en <strong>Hostal Loreto Belén</strong>. Adjuntamos la ficha en PDF con todos los detalles de tu reserva.
                </p>

                <p style="font-size:14px;line-height:1.6;margin:0 0 12px 0;">
                  <strong>Resumen de tu reserva:</strong><br/>
                  Código: <strong>${publicCode}</strong><br/>
                  Fechas: ${fechas}<br/>
                  Huésped: ${guestName}<br/>
                  ${empresaLinea}
                  ${habitacionLinea}
                </p>

                ${totalLinea}

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
}
