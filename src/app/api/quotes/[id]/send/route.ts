import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { sendQuote } from "@/lib/quotes/service";
import { quoteDeps } from "@/lib/quotes/deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;
    try {
        const r = await sendQuote(quoteDeps, Number((await params).id));
        return NextResponse.json({ ok: true, simulated: r.simulated, data: r.quote });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
}
