import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { getSettings, saveSettings } from "@/lib/quotes/repository";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireRole(["superadmin"]);
    if ("response" in auth) return auth.response;
    try {
        return NextResponse.json({ ok: true, data: await getSettings() });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const auth = await requireRole(["superadmin"]);
    if ("response" in auth) return auth.response;
    try {
        await saveSettings(await req.json());
        return NextResponse.json({ ok: true, data: await getSettings() });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
}
