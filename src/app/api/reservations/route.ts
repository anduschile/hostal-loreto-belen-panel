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

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const parsed = ReservationSchema.parse(body);

        const created = await createReservation(parsed);

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

        const parsed = ReservationUpdateSchema.parse(body);

        const updated = await updateReservation(parsed.id, parsed);

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
