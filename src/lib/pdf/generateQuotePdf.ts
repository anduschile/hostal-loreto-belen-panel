import { renderToStream } from "@react-pdf/renderer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { QuoteDocument } from "./QuoteDocument";
import type { QuoteCalcResult } from "../quotes/calc";
import type { QuoteRow } from "../quotes/service";

async function loadLogo(): Promise<Buffer | null> {
    try {
        return await readFile(path.join(process.cwd(), "public", "logo-pdf.png"));
    } catch {
        return null; // sin logo el PDF igual se genera
    }
}

export async function generateQuotePdfBuffer(quote: QuoteRow, calc: QuoteCalcResult): Promise<Buffer> {
    const logo = await loadLogo();
    const stream = await renderToStream(QuoteDocument({ quote, calc, logo }) as any);
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (c) => chunks.push(Buffer.from(c)));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}
