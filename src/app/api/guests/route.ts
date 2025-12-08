import { NextResponse } from "next/server";
import { getGuests, createGuest, updateGuest, deleteGuest } from "@/lib/data/guests";
import { guestSchema } from "@/lib/validators/guests";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("q") || undefined;

        const guests = await getGuests({ search });
        return NextResponse.json({ ok: true, data: guests });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validated = guestSchema.parse(body);
        const newGuest = await createGuest(validated);
        return NextResponse.json({ ok: true, data: newGuest });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;
        if (!id) throw new Error("ID es requerido");

        const updatedGuest = await updateGuest(id, updates);
        return NextResponse.json({ ok: true, data: updatedGuest });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) throw new Error("ID es requerido");

        await deleteGuest(Number(id));
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
