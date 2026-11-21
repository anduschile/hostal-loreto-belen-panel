import { supabaseQuoteRepo } from "./repository";
import { generateQuotePdfBuffer } from "../pdf/generateQuotePdf";
import { sendQuoteEmail } from "../email/sendQuoteEmail";
import type { QuoteDeps } from "./service";

export const quoteDeps: QuoteDeps = {
    repo: supabaseQuoteRepo,
    renderPdf: generateQuotePdfBuffer,
    sendEmail: sendQuoteEmail,
};
