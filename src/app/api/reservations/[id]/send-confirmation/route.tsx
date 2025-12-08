import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { ReservationVoucher } from "@/lib/pdf/ReservationVoucher";
import { getReservationById } from "@/lib/data/reservations";
import { sendEmail } from "@/lib/email/emailService";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Fetch Reservation
        const reservation: any = await getReservationById(Number(id));
        if (!reservation) {
            return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
        }

        // Normalize relations
        if (Array.isArray(reservation.hostal_guests)) reservation.hostal_guests = reservation.hostal_guests[0];
        if (Array.isArray(reservation.hostal_rooms)) reservation.hostal_rooms = reservation.hostal_rooms[0];

        // 2. Validate Guest Email
        const email = reservation.hostal_guests?.email;
        if (!email) {
            return NextResponse.json(
                { error: "El huésped no tiene un correo registrado." },
                { status: 400 }
            );
        }

        // 3. Generate PDF Buffer
        const stream = await renderToStream(<ReservationVoucher reservation={reservation} />);

        // Collect stream to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        const pdfBuffer = Buffer.concat(chunks);

        // 4. Send Email
        await sendEmail({
            to: email,
            subject: `Confirmación de Reserva #${reservation.code || reservation.id} - Hostal Loreto Belén`,
            html: `
        <h2>¡Gracias por su reserva!</h2>
        <p>Estimado/a <b>${reservation.hostal_guests?.full_name}</b>,</p>
        <p>Su reserva en <b>Hostal Loreto Belén</b> ha sido registrada exitosamente.</p>
        <p>
          <b>Habitación:</b> ${reservation.hostal_rooms?.name}<br/>
          <b>Check-in:</b> ${reservation.check_in}<br/>
          <b>Check-out:</b> ${reservation.check_out}
        </p>
        <p>Adjunto encontrará el comprobante detallado en PDF.</p>
        <br/>
        <p>Saludos cordiales,<br/>Equipo Hostal Loreto Belén</p>
      `,
            attachments: [
                {
                    filename: `Reserva-${reservation.code || reservation.id}.pdf`,
                    content: pdfBuffer,
                },
            ],
        });

        return NextResponse.json({ ok: true, message: "Correo enviado correctamente" });

    } catch (error: any) {
        console.error("Error enviando correo:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
