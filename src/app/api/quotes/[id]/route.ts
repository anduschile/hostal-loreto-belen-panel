import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { supabaseQuoteRepo } from "@/lib/quotes/repository";
import { QUOTE_STATUSES } from "@/lib/quotes/calc";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;
    try {
        const quote = await supabaseQuoteRepo.getQuote(Number((await params).id));
        if (!quote) return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 });
        return NextResponse.json({ ok: true, data: quote });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}

// Cambio de estado manual (aceptada / rechazada / vencida...)
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;
    try {
        const { status } = await req.json();
        if (!QUOTE_STATUSES.includes(status)) throw new Error("Estado no válido.");
        const q = await supabaseQuoteRepo.updateQuote(Number((await params).id), { status });
        return NextResponse.json({ ok: true, data: q });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
}
