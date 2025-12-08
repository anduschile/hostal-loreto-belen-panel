import { z } from "zod";

export const guestSchema = z.object({
    full_name: z.string().min(1, "El nombre completo es obligatorio"),
    document_id: z.string().optional().nullable(),
    email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
    phone: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
});

export type GuestFormValues = z.infer<typeof guestSchema>;
