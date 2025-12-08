import { NextResponse } from "next/server";
import { updateRoom } from "@/lib/data/rooms";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json(
                { ok: false, error: "Falta id o status" },
                { status: 400 }
            );
        }

        await updateRoom(Number(id), { status });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e.message },
            { status: 500 }
        );
    }
}
