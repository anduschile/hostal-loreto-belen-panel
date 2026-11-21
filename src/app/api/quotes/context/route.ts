import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { getRates, getSettings } from "@/lib/quotes/repository";

export const dynamic = "force-dynamic";

// Lectura de tarifas y configuración para armar una cotización (cualquier usuario activo del panel).
export async function GET() {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;
    try {
        const [rates, settings] = await Promise.all([getRates(), getSettings()]);
        return NextResponse.json({ ok: true, data: { rates, settings } });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
