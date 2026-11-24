// Esquemas Zod de la API pública (modo estricto: se rechazan campos desconocidos).
// Los límites de largo son iguales o menores a los de la base. La disponibilidad,
// la estadía máxima y los límites anti-spam los decide la base, no este código.

import { z } from "zod";

export const ROOM_TYPES = ["matrimonial", "doble", "triple", "cuadruple"] as const;
export type PublicRoomType = (typeof ROOM_TYPES)[number];

/** Horas que se mantiene una solicitud provisoria (p_hold_hours). */
export const HOLD_HOURS = 24;

/** Colapsa espacios (incluye saltos de línea y tabulaciones) y recorta los extremos. */
export function normalizeSpaces(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

/** True si `value` es una fecha real en formato YYYY-MM-DD (rechaza 2026-02-30). */
export function isRealDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Noches entre dos fechas YYYY-MM-DD válidas. */
export function nightsBetween(checkIn: string, checkOut: string): number {
    const a = Date.parse(`${checkIn}T00:00:00Z`);
    const b = Date.parse(`${checkOut}T00:00:00Z`);
    return Math.round((b - a) / 86_400_000);
}

const dateField = z
    .string()
    .refine(isRealDate, { message: "Fecha inválida (YYYY-MM-DD)" });

const text = (min: number, max: number) =>
    z.string().transform(normalizeSpaces).pipe(z.string().min(min).max(max));

const rangeOrder = (v: { check_in: string; check_out: string }) => v.check_out > v.check_in;
const rangeIssue = { message: "check_out debe ser posterior a check_in", path: ["check_out"] };

/** GET /api/public/availability */
export const AvailabilityQuerySchema = z
    .strictObject({
        check_in: dateField,
        check_out: dateField,
    })
    .refine(rangeOrder, rangeIssue);

export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

/** POST /api/public/reservation-requests */
export const ReservationRequestSchema = z
    .strictObject({
        check_in: dateField,
        check_out: dateField,
        room_type: z
            .string()
            .transform((s) => s.trim().toLowerCase())
            .pipe(z.enum(ROOM_TYPES)),
        adults: z.number().int().min(1).max(6),
        children: z.number().int().min(0).max(6).default(0),
        full_name: text(3, 120),
        email: z
            .string()
            .transform((s) => s.trim().toLowerCase())
            .pipe(z.email().max(160)),
        phone: z.string().transform(normalizeSpaces).pipe(z.string().max(30)).optional(),
        notes: z.string().transform(normalizeSpaces).pipe(z.string().max(500)).optional(),
        // Honeypot: un humano nunca lo completa.
        website: z.string().max(500).optional(),
    })
    .refine(rangeOrder, rangeIssue);

export type ReservationRequestInput = z.infer<typeof ReservationRequestSchema>;

/** Nombres de los campos con error (sin valores), para responder 400 sin filtrar datos. */
export function issueFields(error: z.ZodError): string[] {
    const fields = new Set<string>();
    for (const issue of error.issues) {
        const path = issue.path.join(".");
        if (issue.code === "unrecognized_keys") {
            fields.add("campos_desconocidos");
        } else {
            fields.add(path || "body");
        }
    }
    return [...fields];
}
