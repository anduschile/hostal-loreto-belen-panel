
import { renderToStream } from "@react-pdf/renderer";
import { ReservationVoucher } from "./ReservationVoucher";

export async function generateReservationVoucherPdfBuffer(
    reservation: any
): Promise<Buffer> {
    const stream = await renderToStream(
        ReservationVoucher({ reservation }) as any
    );

    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}
