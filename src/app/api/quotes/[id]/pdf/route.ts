import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { quoteDeps } from "@/lib/quotes/deps";
import { calcForRow } from "@/lib/quotes/service";
import { formatQuoteCode } from "@/lib/quotes/calc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Descarga del PDF de una cotización (no envía nada).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;
    try {
        const quote = await quoteDeps.repo.getQuote(Number((await params).id));
        if (!quote) return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 });
        const calc = calcForRow(quote, await quoteDeps.repo.getRates());
        const pdf = await quoteDeps.renderPdf(quote, calc);
        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="cotizacion_${formatQuoteCode(quote.number)}.pdf"`,
            },
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
