// src/lib/validators/reservations.ts
import { z } from "zod";

/**
 * Base schema for a reservation — shared by Create & Update
 */
const BaseReservationSchema = z.object({
    guest_id: z.number().int({
        required_error: "El huésped es obligatorio",
    }),

    room_id: z.number().int({
        required_error: "La habitación es obligatoria",
    }),

    company_id: z.number().int().nullable().optional(),

    check_in: z
        .string({
            required_error: "La fecha de entrada es obligatoria",
        })
        .min(1),

    check_out: z
        .string({
            required_error: "La fecha de salida es obligatoria",
        })
        .min(1),

    status: z
        .enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled", "blocked"])
        .default("pending"),

    total_price: z.number().nonnegative().default(0),

    notes: z.string().nullish(),

    adults: z.number().int().nonnegative().default(1),
    children: z.number().int().nonnegative().default(0),

    source: z.string().nullish(),

    companions_json: z.any().nullish(),

    // Nuevos campos
    arrival_time: z.string().nullish(),      // HH:MM
    breakfast_time: z.string().nullish(),    // HH:MM

    // Facturación
    invoice_number: z.string().nullish(),
    invoice_status: z.string().nullish(),
    invoice_notes: z.string().nullish(),
    invoice_date: z.string().nullish(),
}).passthrough();


/**
 * CREATE — does NOT include ID
 */
export const ReservationSchema = BaseReservationSchema;

/**
 * UPDATE — includes ID
 */
export const ReservationUpdateSchema = BaseReservationSchema.extend({
    id: z.number().int({
        required_error: "ID obligatorio para actualizar",
    }),
});

export type ReservationInput = z.infer<typeof ReservationSchema>;
export type ReservationUpdateInput = z.infer<typeof ReservationUpdateSchema>;
