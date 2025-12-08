
import { NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { ReservationVoucher } from "@/lib/pdf/ReservationVoucher";
import { getReservationById } from "@/lib/data/reservations";

export const dynamic = "force-dynamic";

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Await params (Next.js 15/16 requirement)
        const params = await props.params;

        // 2. Validate ID
        // getReservationById expects a number. 
        // We ensure it is a valid positive integer.
        const id = Number(params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return new Response("Invalid reservation id", { status: 400 });
        }

        // 3. Fetch reservation
        const reservation = await getReservationById(id);
        if (!reservation) {
            return new Response("Reservation not found", { status: 404 });
        }

        // 4. Create PDF Element (Calling function directly to avoid JSX in .ts)
        const pdfElement = ReservationVoucher({ reservation });

        // 5. Render to stream
        const stream = await renderToStream(pdfElement);

        // 6. Filename
        const safeCode = (reservation as any).code || `reserva-${id}`;

        // 7. Return PDF
        return new Response(stream as any, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${safeCode}.pdf"`,
            },
        });
    } catch (error) {
        console.error("Error generating voucher:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
