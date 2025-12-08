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
});
