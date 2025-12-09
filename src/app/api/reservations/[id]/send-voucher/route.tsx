// src/app/api/reservations/[id]/send-voucher/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ⬇️ AJUSTA ESTOS IMPORTS SI EN TU PROYECTO TIENEN OTRO NOMBRE/RUTA
import { resend } from "@/lib/email/resendClient"; // o "@/lib/email/resend" según lo tengas
import { getReservationWithRelationsById } from "@/lib/data/reservations"; // helper que devuelve reserva + guest + room + company
import { generateReservationVoucherPdfBuffer } from "@/lib/pdf/generateReservationVoucherPdf"; // helper que genera el PDF como Buffer
import { formatPublicReservationCode } from "@/lib/reservations/formatPublicReservationCode";

// Tipos mínimos para que TS no se queje
type GuestForEmail = {
  email?: string | null;
  full_name?: string | null;
};

type CompanyForEmail = {
  name?: string | null;
  contact_email?: string | null;
  email?: string | null;
};

type RoomForEmail = {
  name?: string | null;
};

type ReservationEmailPayload = {
  id: number;
  code: string;
  guest_name: string | null;
  guest_email: string | null;
  company_name: string | null;
  check_in: string; // ISO string
  check_out: string; // ISO string
  room_name: string | null;
  total_price: number | null;
  currency: string | null;
};

// helper simple para formatear fechas legibles en el correo
function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCurrencyCLP(amount: number | null | undefined) {
  if (!amount || amount <= 0) return null;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

const paramsSchema = z.object({
  id: z.string(),
});

export async function POST(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 1) Validar params
    const { id } = paramsSchema.parse(context.params);
    const numericId = Number(id);

    if (Number.isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de reserva inválido" },
        { status: 400 }
      );
    }

    // 2) Traer reserva con relaciones (huésped, empresa, habitación, montos, etc.)
    // ⬇️ AJUSTA ESTE HELPER si en tu proyecto el nombre es distinto
    const reservation = await getReservationWithRelationsById(numericId);

    if (!reservation) {
      return NextResponse.json(
        { ok: false, error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // 3) Extraer datos necesarios para el correo
    const guest = (reservation.hostal_guests || null) as GuestForEmail | null;
    const company = (reservation.hostal_companies ||
      null) as CompanyForEmail | null;
    const room = (reservation.hostal_rooms || null) as RoomForEmail | null;

    const guestEmail: string | null = guest?.email ?? null;

    if (!guestEmail) {
      return NextResponse.json(
        { ok: false, error: "El huésped no tiene email registrado" },
        { status: 400 }
      );
    }

    const companyEmail: string | null =
      company?.contact_email ?? company?.email ?? null;

    const payload: ReservationEmailPayload = {
      id: reservation.id,
      code: reservation.code,
      guest_name: reservation.guest_name ?? guest?.full_name ?? null,
      guest_email: guestEmail,
      company_name: reservation.company_name_snapshot ?? company?.name ?? null,
      check_in: reservation.check_in,
      check_out: reservation.check_out,
      room_name: reservation.room_name ?? room?.name ?? null,
      total_price: reservation.total_price ?? reservation.amount_total ?? null,
      currency: reservation.currency ?? "CLP",
    };

    const publicCode = formatPublicReservationCode({
      id: payload.id,
      code: payload.code,
    });

    const totalFormatted = formatCurrencyCLP(payload.total_price);

    // 4) Generar el PDF de la reserva como Buffer
    const pdfBuffer = await generateReservationVoucherPdfBuffer(
      reservation.id
    );

    // 5) Construir HTML del correo (estilo tarjeta centrada)
    const html = buildEmailHtml({ payload, publicCode, totalFormatted });

    // 6) Enviar email usando resend
    // ⬇️ AJUSTA ESTE ENVÍO según cómo esté configurado tu cliente resend
    const { error } = await resend.emails.send({
      from: process.env.SMTP_FROM || "reservas@loretobelen.cl",
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
          error: "No se pudo enviar el correo. Intente nuevamente más tarde.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error en send-voucher route:", err);
    const message =
      err?.message && typeof err.message === "string"
        ? err.message
        : "Error inesperado";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Helper para construir el HTML del correo
function buildEmailHtml(args: {
  payload: ReservationEmailPayload;
  publicCode: string;
  totalFormatted: string | null;
}) {
  const { payload, publicCode, totalFormatted } = args;

  const guestName = payload.guest_name || "estimado/a";

  const fechas = `${formatDate(payload.check_in)} – ${formatDate(
    payload.check_out
  )}`;

  const empresaLinea = payload.company_name
    ? `Empresa: ${payload.company_name}<br/>`
    : "";

  const habitacionLinea = payload.room_name
    ? `Habitación: ${payload.room_name}<br/>`
    : "";

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
                  Huésped: ${payload.guest_name || "Sin nombre registrado"}<br/>
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
