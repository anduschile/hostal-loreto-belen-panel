import { z } from "zod";

export const PaymentSchema = z.object({
    amount: z.number().min(0, "El monto debe ser positivo"),
    method: z.enum(["efectivo", "transferencia", "tarjeta", "webpay", "otro"]),
    document_type: z.enum(["boleta", "factura", "guia", "ninguno"]),
    document_number: z.string().optional().nullable(),
    payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
    notes: z.string().optional().nullable(),
    reservation_id: z.number().optional().nullable(),
    guest_id: z.number().optional().nullable(),
    company_id: z.number().optional().nullable(),
    currency: z.string().default("CLP"),
});

export const PaymentUpdateSchema = PaymentSchema.partial().extend({
    id: z.number(),
});

export type PaymentSchemaType = z.infer<typeof PaymentSchema>;
