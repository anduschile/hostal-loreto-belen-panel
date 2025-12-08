import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { ReservationVoucher } from "@/lib/pdf/ReservationVoucher";
import { getReservationById } from "@/lib/data/reservations";

export async function GET(
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

        // Normalize relations (in case they come as arrays)
        if (Array.isArray(reservation.hostal_guests)) reservation.hostal_guests = reservation.hostal_guests[0];
        if (Array.isArray(reservation.hostal_rooms)) reservation.hostal_rooms = reservation.hostal_rooms[0];

        // 2. Render PDF Stream
        const stream = await renderToStream(<ReservationVoucher reservation={reservation} />);

        // 3. Return as PDF
        // @ts-ignore
        const webStream = new ReadableStream({
            start(controller) {
                stream.on("data", (chunk) => controller.enqueue(chunk));
                stream.on("end", () => controller.close());
                stream.on("error", (err) => controller.error(err));
            },
        });

        return new NextResponse(webStream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="reserva-${reservation.code || reservation.id}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error("Error generando PDF:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
