
import { NextRequest, NextResponse } from "next/server";
import { updateDaybookInvoice } from "@/lib/data/daybook";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Schema for validation
const InvoiceUpdateSchema = z.object({
    invoice_status: z.enum(["pending", "invoiced", "partial"]).optional(),
    invoice_number: z.string().optional().nullable(),
    invoice_date: z.string().optional().nullable(),
});

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = Number(params.id);

        if (!id || Number.isNaN(id)) {
            return NextResponse.json({ error: "Invalid reservation ID" }, { status: 400 });
        }

        const body = await req.json();
        const parsed = InvoiceUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid data", details: parsed.error.format() },
                { status: 400 }
            );
        }

        const { invoice_status, invoice_number, invoice_date } = parsed.data;

        await updateDaybookInvoice({
            reservationId: id,
            invoice_status: invoice_status,
            invoice_number: invoice_number === null ? "" : invoice_number, // Treat null as empty if needed, or pass as undefined
            invoice_date: invoice_date === null ? undefined : invoice_date,
        });

        return NextResponse.json({ ok: true, message: "Invoice updated" });
    } catch (error: any) {
        console.error("Error updating invoice:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
