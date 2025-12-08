import { z } from "zod";

export const roomSchema = z.object({
    code: z.string().min(1, "El código es obligatorio"),
    name: z.string().min(1, "El nombre es obligatorio"),
    room_type: z.string().min(1, "El tipo es obligatorio"),
    annex: z.string().optional().nullable(),
    floor: z.number().optional().nullable(),
    status: z.enum(["disponible", "ocupada", "mantenimiento", "limpieza", "fuera_servicio"]),
    capacity_adults: z.number().min(1, "Capacidad mínima 1"),
    capacity_children: z.number().min(0).default(0),
    default_rate: z.number().min(0).optional().nullable(),
    currency: z.string().default("CLP"),
    notes: z.string().optional().nullable(),
});

export type RoomFormValues = z.infer<typeof roomSchema>;
