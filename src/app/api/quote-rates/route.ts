import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { getRates, saveRates } from "@/lib/quotes/repository";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireRole(["superadmin"]);
    if ("response" in auth) return auth.response;
    try {
        return NextResponse.json({ ok: true, data: await getRates() });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}

// Solo administradores (superadmin)
export async function PUT(req: Request) {
    const auth = await requireRole(["superadmin"]);
    if ("response" in auth) return auth.response;
    try {
        await saveRates(await req.json());
        return NextResponse.json({ ok: true, data: await getRates() });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
}
