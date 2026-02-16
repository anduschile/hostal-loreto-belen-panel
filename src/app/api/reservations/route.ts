import { NextResponse } from "next/server";
import {
    getReservations,
    createReservation,
    updateReservation,
    deleteReservation,
} from "@/lib/data/reservations";

import {
    ReservationSchema,
    ReservationUpdateSchema,
} from "@/lib/validators/reservations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;
        const status = searchParams.get("status") || undefined;
        const roomIdParam = searchParams.get("room_id");
        const companyIdParam = searchParams.get("company_id");

        const roomId = roomIdParam ? Number(roomIdParam) : undefined;
        const companyId = companyIdParam ? Number(companyIdParam) : undefined;

        const data = await getReservations({
            fromDate: from,
            toDate: to,
            status,
            roomId,
            companyId,
        });

        return NextResponse.json({ ok: true, data });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e.message },
            { status: 500 }
        );
    }
}

import { upsertExternalReservationPayments } from "@/lib/data/payments";

// ... imports remain the same

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // NORMALIZACIÓN DE PAYLOAD
        // Si es INTERNAL, limpiamos los campos externos para evitar errores de validación
        if (body.fulfillment_type === 'INTERNAL') {
            body.external_sale_total = undefined;
            body.external_supplier_cost_total = undefined;
            body.external_lodging_name = undefined;
            body.external_notes = undefined;
        }

        const parsed = ReservationSchema.parse(body);

        // Si es external, asegurar que room_id no rompa FK if using 0 or null?
        // En data layer `mapToDb` lo pasamos. Si la DB admite null, bien.
        // Si no, la DB fallará. Asumimos que la migración corrió y room_id es nullable.

        const created = await createReservation(parsed);

        // --- TRIGGER PAGOS EXTERNOS ---
        if (parsed.fulfillment_type === 'EXTERNAL') {
            await upsertExternalReservationPayments(
                created.id,
                parsed.external_lodging_name || "Desconocido",
                parsed.external_sale_total || 0,
                parsed.external_supplier_cost_total || 0,
                parsed.check_in
            );
        }

        return NextResponse.json({ ok: true, data: created });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e.message },
            { status: 400 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();

        // NORMALIZACIÓN DE PAYLOAD (Igual que POST)
        if (body.fulfillment_type === 'INTERNAL') {
            body.external_sale_total = undefined;
            body.external_supplier_cost_total = undefined;
            body.external_lodging_name = undefined;
            body.external_notes = undefined;
        }

        const parsed = ReservationUpdateSchema.parse(body);

        const updated = await updateReservation(parsed.id, parsed);

        // --- TRIGGER PAGOS EXTERNOS (Actualización) ---
        if (parsed.fulfillment_type === 'EXTERNAL') {
            await upsertExternalReservationPayments(
                parsed.id,
                parsed.external_lodging_name || "Desconocido",
                parsed.external_sale_total || 0,
                parsed.external_supplier_cost_total || 0,
                parsed.check_in
            );
        }

        return NextResponse.json({ ok: true, data: updated });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e.message },
            { status: 400 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = Number(searchParams.get("id"));

        if (!id || Number.isNaN(id)) {
            return NextResponse.json(
                { ok: false, error: "ID inválido para eliminar" },
                { status: 400 }
            );
        }

        await deleteReservation(id);

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e.message },
            { status: 500 }
        );
    }
}
