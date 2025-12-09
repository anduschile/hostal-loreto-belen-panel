// src/app/api/reservations/[id]/send-voucher/route.tsx

import { NextResponse } from "next/server";
import { resend } from "@/lib/email/resendClient";
import { getReservationById } from "@/lib/data/reservations";
import { formatPublicReservationCode } from "@/lib/reservations/formatPublicReservationCode";

export const runtime = "nodejs"; // Necesitamos Buffer, etc.
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, props: RouteParams) {
  try {
    const { id } = await props.params;

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID de la reserva" },
        { status: 400 }
      );
    }

    // 1) Traer la reserva con todas sus relaciones
    const reservation: any = await getReservationById(Number(id));

    if (!reservation) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    const guest = reservation.hostal_guests ?? reservation.guest ?? reservation.huesped ?? {};
    const company = reservation.hostal_companies ?? reservation.company ?? reservation.empresa ?? {};
    const room = reservation.hostal_rooms ?? reservation.room ?? reservation.habitacion ?? {};

    const guestEmail: string | undefined =
      guest.email || guest.correo || guest.mail;

    if (!guestEmail) {
      return NextResponse.json(
        {
          error:
            "La reserva no tiene correo de huésped asociado. No se puede enviar el email.",
        },
        { status: 400 }
      );
    }

    // Código público LB-xxxxx
    const publicCode =
      reservation.public_code ||
      reservation.publicCode ||
      formatPublicReservationCode(reservation);

    // 2) Obtener el PDF desde el endpoint existente /api/reservations/[id]/voucher
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    const pdfResponse = await fetch(
      `${origin}/api/reservations/${id}/voucher`
    );

    if (!pdfResponse.ok) {
      console.error(
        "Error al obtener el PDF desde /api/reservations/[id]/voucher:",
        pdfResponse.status,
        await pdfResponse.text().catch(() => "")
      );
      return NextResponse.json(
        { error: "No se pudo generar el PDF de la reserva." },
        { status: 500 }
      );
    }

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // 3) Armar el HTML del correo
    const checkIn =
      reservation.check_in || reservation.checkIn || reservation.fecha_entrada;
    const checkOut =
      reservation.check_out || reservation.checkOut || reservation.fecha_salida;
    const nights =
      reservation.nights || reservation.noches || reservation.cant_noches;

    const total =
      reservation.total ||
      reservation.total_amount ||
      reservation.monto_total ||
      0;
    const net =
      reservation.net ||
      reservation.net_amount ||
      reservation.monto_neto ||
      undefined;
    const tax =
      reservation.tax ||
      reservation.vat ||
      reservation.iva ||
      undefined;

    const guestName = guest.name || guest.full_name || guest.nombre || "";
    const companyName = company.name || company.razon_social || "";
    const roomName = room.name || room.nombre || "";

    const subject = `Voucher de Reserva ${publicCode} - Hostal Loreto Belén`;

    const html = `
      <div style="background-color:#f3f4f6;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
          <h1 style="font-size:20px;margin:0 0 8px 0;color:#111827;">Hostal Loreto Belén</h1>
          <p style="margin:0 0 16px 0;color:#6b7280;font-size:14px;">
            Confirmación de reserva · Código <strong>${publicCode}</strong>
          </p>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

          <h2 style="font-size:16px;margin:0 0 8px 0;color:#111827;">Datos de la reserva</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
            <tr>
              <td style="padding:4px 0;font-weight:600;width:30%;">Huésped</td>
              <td style="padding:4px 0;">${guestName || "-"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-weight:600;">Empresa</td>
              <td style="padding:4px 0;">${companyName || "-"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-weight:600;">Habitación</td>
              <td style="padding:4px 0;">${roomName || "-"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-weight:600;">Check-in</td>
              <td style="padding:4px 0;">${checkIn || "-"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-weight:600;">Check-out</td>
              <td style="padding:4px 0;">${checkOut || "-"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-weight:600;">Noches</td>
              <td style="padding:4px 0;">${nights ?? "-"}</td>
            </tr>
          </table>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

          <h2 style="font-size:16px;margin:0 0 8px 0;color:#111827;">Detalle económico</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
            ${net !== undefined
        ? `<tr>
                    <td style="padding:4px 0;font-weight:600;width:30%;">Neto</td>
                    <td style="padding:4px 0;">$${Number(net).toLocaleString("es-CL")}</td>
                  </tr>`
        : ""
      }
            ${tax !== undefined
        ? `<tr>
                    <td style="padding:4px 0;font-weight:600;">IVA</td>
                    <td style="padding:4px 0;">$${Number(tax).toLocaleString("es-CL")}</td>
                  </tr>`
        : ""
      }
            <tr>
              <td style="padding:4px 0;font-weight:600;">Total</td>
              <td style="padding:4px 0;">$${Number(total).toLocaleString("es-CL")}</td>
            </tr>
          </table>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

          <p style="margin:0 0 8px 0;color:#111827;font-weight:600;font-size:14px;">Condiciones generales</p>
          <ul style="margin:0 0 16px 18px;padding:0;color:#4b5563;font-size:13px;">
            <li>Baño privado en la habitación.</li>
            <li>Desayuno incluido según condiciones del hostal.</li>
            <li>Estacionamiento sujeto a disponibilidad.</li>
          </ul>

          <p style="margin:0 0 4px 0;color:#6b7280;font-size:12px;">
            En el PDF adjunto encontrarás el detalle completo de tu reserva.
          </p>
          <p style="margin:0;color:#6b7280;font-size:12px;">
            Si tienes dudas, responde a este correo o contáctanos directamente.
          </p>
        </div>
      </div>
    `;

    // 4) Enviar correo con Resend
    const sendResult = await resend.emails.send({
      from: "Hostal Loreto Belén <no-reply@hostalloretobelen.cl>",
      to: [guestEmail],
      subject,
      html,
      attachments: [
        {
          filename: `Reserva-${publicCode}.pdf`,
          // Usamos Buffer directamente para evitar problemas de tipos con "type" o content strings.
          content: pdfBuffer,
        },
      ],
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Correo enviado correctamente",
        to: guestEmail,
        resendId: (sendResult as any)?.id ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en POST /api/reservations/[id]/send-voucher:", error);
    return NextResponse.json(
      { error: "Error interno al enviar el correo" },
      { status: 500 }
    );
  }
}
