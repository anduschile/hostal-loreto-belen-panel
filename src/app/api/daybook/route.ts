import { NextResponse } from "next/server";
import { getDaybook, updateDaybookInvoice } from "@/lib/data/daybook";
import { z } from "zod";

// Schema local para validación del PUT
const InvoiceUpdateSchema = z.object({
    reservationId: z.union([z.string(), z.number()]),
    invoice_status: z.enum(["pending", "invoiced", "partial"]).optional(),
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get("date");

        if (!date) {
            return NextResponse.json({ ok: false, error: "Fecha obligatoria (date)" }, { status: 400 });
        }

        const entries = await getDaybook(date);

        return NextResponse.json({
            ok: true,
            data: entries,
        });
    } catch (error: any) {
        console.error("GET /api/daybook error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Error al obtener libro del día" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();

        const validation = InvoiceUpdateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { ok: false, error: "Datos inválidos", details: validation.error.format() },
                { status: 400 }
            );
        }

        const { reservationId, invoice_status, invoice_number, invoice_date } = validation.data;

        await updateDaybookInvoice({
            reservationId,
            invoice_status: invoice_status as any,
            invoice_number,
            invoice_date
        });

        return NextResponse.json({ ok: true });

    } catch (error: any) {
        console.error("PUT /api/daybook error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Error al actualizar facturación" },
            { status: 500 }
        );
    }
}
