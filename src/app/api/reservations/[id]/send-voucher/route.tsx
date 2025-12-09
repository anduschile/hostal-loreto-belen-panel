
import { NextResponse } from "next/server";
import { getReservationById } from "@/lib/data/reservations";
import { formatPublicReservationCode } from "@/lib/reservations/formatPublicReservationCode";
import { generateReservationVoucherPdfBuffer } from "@/lib/pdf/generateReservationVoucherPdf";
import { sendReservationVoucherEmail } from "@/lib/email/sendReservationVoucherEmail";

export const runtime = "nodejs";
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
    // Nota: getReservationById trae las relaciones raw de Supabase (hostal_guests, etc)
    const reservation: any = await getReservationById(Number(id));

    if (!reservation) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // 2) Obtener datos del huésped
    const guest =
      reservation.hostal_guests ?? reservation.guest ?? reservation.huesped ?? {};

    // El frontend actualiza el email antes de llamar a este endpoint, 
    // así que confiamos en que esté en la DB.
    const guestEmail: string | undefined =
      guest.email || guest.correo || guest.mail;

    const guestName = guest.full_name || guest.name || guest.nombre || "Huésped";

    if (!guestEmail) {
      return NextResponse.json(
        {
          error:
            "La reserva no tiene correo de huésped asociado. No se puede enviar el email.",
        },
        { status: 400 }
      );
    }

    // 3) Código Público
    const publicCode = formatPublicReservationCode(reservation);

    // 4) Generar PDF (Buffer)
    const pdfBuffer = await generateReservationVoucherPdfBuffer(reservation);

    // 5) Enviar Correo
    await sendReservationVoucherEmail({
      toEmail: guestEmail,
      guestName,
      publicCode,
      pdfBuffer,
    });

    return NextResponse.json({
      ok: true,
      message: `Voucher enviado a ${guestEmail}`,
    });

  } catch (error: any) {
    console.error("Error en POST /api/reservations/[id]/send-voucher:", error);
    return NextResponse.json(
      { error: error.message || "Error interno al enviar el correo" },
      { status: 500 }
    );
  }
}
