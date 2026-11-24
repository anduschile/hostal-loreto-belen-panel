import { z } from "zod";

export const reservationStatusSchema = z.object({
    status: z.enum([
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "blocked",
    ]),
    // Solo lo respeta el servidor si el usuario autenticado es superadmin.
    allow_overlap: z.boolean().optional(),
});
