// src/lib/validators/reservations.ts
import { z } from "zod";

/**
 * Base schema definition (without Refine)
 */
const ReservationBase = z.object({
    guest_id: z.number().int(),

    // Room ID is now potentially nullable/optional in base,
    // enforced later via superRefine based on fulfillment_type
    room_id: z.number().int().nullish(),

    company_id: z.number().int().nullable().optional(),

    check_in: z.string().min(1, "La fecha de entrada es obligatoria"),

    check_out: z.string().min(1, "La fecha de salida es obligatoria"),

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

    // External Referral
    fulfillment_type: z.enum(["INTERNAL", "EXTERNAL"]).default("INTERNAL"),
    external_lodging_name: z.string().nullish(),
    external_sale_total: z.number().nonnegative().nullish(), // Changed to nullish to accept null
    external_supplier_cost_total: z.number().nonnegative().nullish(), // Changed to nullish to accept null
    external_supplier_payment_status: z.enum(["PENDING", "PAID"]).default("PENDING"),
    external_notes: z.string().nullish(),
}).passthrough();

/**
 * Validation Logic shared by Create and Update
 */
const refineReservation = (data: z.infer<typeof ReservationBase>, ctx: z.RefinementCtx) => {
    // 1. VALIDACIÓN INTERNA
    if (data.fulfillment_type === "INTERNAL") {
        if (!data.room_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Debe seleccionar una habitación para reservas internas",
                path: ["room_id"],
            });
        }
    }

    // 2. VALIDACIÓN EXTERNA (DERIVACIÓN)
    if (data.fulfillment_type === "EXTERNAL") {
        if (!data.external_lodging_name || data.external_lodging_name.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Nombre del hostal externo es obligatorio",
                path: ["external_lodging_name"],
            });
        }

        // Validar montos obligatorios para EXTERNAL
        if (data.external_sale_total === null || data.external_sale_total === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Ingresa Total Venta",
                path: ["external_sale_total"],
            });
        }

        if (data.external_supplier_cost_total === null || data.external_supplier_cost_total === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Ingresa Total Costo",
                path: ["external_supplier_cost_total"],
            });
        }
    }
};

/**
 * CREATE — does NOT include ID
 */
export const ReservationSchema = ReservationBase.superRefine(refineReservation);

/**
 * UPDATE — includes ID
 */
export const ReservationUpdateSchema = ReservationBase.extend({
    id: z.number().int(),
}).superRefine(refineReservation); // Re-apply validation since extend returns ZodObject (before refine) is incorrect?
// Start: extend works on ZodObject. ReservationBase is ZodObject.
// So: Base.extend(..).superRefine(...) works. Correct.

export type ReservationInput = z.infer<typeof ReservationSchema>;
export type ReservationUpdateInput = z.infer<typeof ReservationUpdateSchema>;
