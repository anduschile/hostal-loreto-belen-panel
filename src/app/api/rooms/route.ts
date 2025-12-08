import { NextResponse } from "next/server";
import { createRoom, updateRoom } from "@/lib/data/rooms";

// Crear habitación
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const created = await createRoom({
            code: body.code,
            name: body.name,
            room_type: body.room_type,
            capacity_adults: body.capacity_adults,
            capacity_children: body.capacity_children ?? 0,
            annex: body.annex ?? null,
            notes: body.notes ?? null,
            status: body.status ?? "disponible",
            currency: body.currency ?? "CLP",
            default_rate: body.default_rate ?? null,
        });

        return NextResponse.json({ ok: true, data: created });
    } catch (err: any) {
        console.error("Error POST /api/rooms", err);
        return NextResponse.json(
            { ok: false, error: err.message || "Error al crear habitación" },
            { status: 500 }
        );
    }
}

// Actualizar datos completos (editar)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...rest } = body;

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "Falta id de habitación" },
                { status: 400 }
            );
        }

        const updated = await updateRoom(id, {
            code: rest.code,
            name: rest.name,
            room_type: rest.room_type,
            capacity_adults: rest.capacity_adults,
            capacity_children: rest.capacity_children ?? 0,
            annex: rest.annex ?? null,
            notes: rest.notes ?? null,
            status: rest.status ?? "disponible",
            currency: rest.currency ?? "CLP",
            default_rate: rest.default_rate ?? null,
        });

        return NextResponse.json({ ok: true, data: updated });
    } catch (err: any) {
        console.error("Error PUT /api/rooms", err);
        return NextResponse.json(
            { ok: false, error: err.message || "Error al actualizar habitación" },
            { status: 500 }
        );
    }
}

// Actualizar solo estado (desde el select de la tarjeta)
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "Falta id de habitación" },
                { status: 400 }
            );
        }

        const updated = await updateRoom(id, { status });

        return NextResponse.json({ ok: true, data: updated });
    } catch (err: any) {
        console.error("Error PATCH /api/rooms", err);
        return NextResponse.json(
            { ok: false, error: err.message || "Error al actualizar estado" },
            { status: 500 }
        );
    }
}
