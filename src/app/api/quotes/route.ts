import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { listQuotes } from "@/lib/quotes/repository";
import { createQuote } from "@/lib/quotes/service";
import { quoteDeps } from "@/lib/quotes/deps";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;
    try {
        return NextResponse.json({ ok: true, data: await listQuotes() });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;
    try {
        const quote = await createQuote(quoteDeps, await req.json());
        return NextResponse.json({ ok: true, data: quote }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
}
