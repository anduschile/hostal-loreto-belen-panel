// Detección de solapamiento de reservas en una misma habitación (función pura).
//
// Regla: A y B se solapan si check_in_A < check_out_B y check_in_B < check_out_A.
// La noche de salida queda libre (salida == entrada del siguiente NO solapa).

export type OverlapReservation = {
    id: number;
    room_id: number | null;
    fulfillment_type?: string | null;
    status?: string | null;
    check_in: string; // YYYY-MM-DD (se usan los primeros 10 caracteres)
    check_out: string; // YYYY-MM-DD
    hold_expires_at?: string | null;
};

export type OverlapQuery = {
    room_id: number;
    check_in: string;
    check_out: string;
    exclude_id?: number | null;
};

/** Estados que no ocupan la habitación. */
export const IGNORED_STATUSES = ["cancelled", "cancelada", "rechazada", "checked_out", "salida"] as const;

const day = (s: string) => String(s).slice(0, 10);

/** True si es una reserva pending con hold ya vencido (hold_expires_at <= ahora). */
function isExpiredHold(r: OverlapReservation, now: Date): boolean {
    if (String(r.status ?? "").trim().toLowerCase() !== "pending") return false;
    if (!r.hold_expires_at) return false;
    const t = new Date(r.hold_expires_at).getTime();
    if (Number.isNaN(t)) return false;
    return t <= now.getTime();
}

/** Devuelve las reservas de `reservations` que se solapan con la nueva reserva. */
export function findOverlaps<T extends OverlapReservation>(
    reservations: T[],
    query: OverlapQuery,
    now: Date = new Date()
): T[] {
    const newIn = day(query.check_in);
    const newOut = day(query.check_out);

    return reservations.filter((r) => {
        if (r.room_id === null || r.room_id === undefined) return false;
        if (Number(r.room_id) !== Number(query.room_id)) return false;
        if (r.fulfillment_type !== "INTERNAL") return false;
        if (query.exclude_id != null && Number(r.id) === Number(query.exclude_id)) return false;

        const status = String(r.status ?? "").trim().toLowerCase();
        if ((IGNORED_STATUSES as readonly string[]).includes(status)) return false;
        if (isExpiredHold(r, now)) return false;

        return day(r.check_in) < newOut && newIn < day(r.check_out);
    });
}

// ---------------------------------------------------------------------------
// ¿Hay que validar el solapamiento al guardar? (función pura)
// ---------------------------------------------------------------------------

export type ReservationShape = {
    room_id?: number | null;
    fulfillment_type?: string | null;
    status?: string | null;
    check_in?: string | null;
    check_out?: string | null;
};

/** True si la reserva ocupa una habitación: INTERNAL, con room_id y estado no ignorado. */
export function blocksRoom(r: ReservationShape): boolean {
    if (r.room_id === null || r.room_id === undefined) return false;
    if (r.fulfillment_type !== "INTERNAL") return false;
    const status = String(r.status ?? "").trim().toLowerCase();
    return !(IGNORED_STATUSES as readonly string[]).includes(status);
}

const dayOf = (s: string | null | undefined) => String(s ?? "").slice(0, 10);

/**
 * Decide si hay que validar el solapamiento antes de escribir.
 * - Creación (prev = null): solo si la reserva resultante bloquea.
 * - Edición / cambio de estado: solo si la resultante bloquea Y cambió la habitación,
 *   las fechas, o la reserva previa no bloqueaba (p. ej. cancelled -> pending).
 *   Si no cambió nada de eso no se valida, para que las reservas ya solapadas sigan editables.
 * - Cancelar (o cualquier estado ignorado) nunca se valida.
 */
export function shouldValidateOverlap(prev: ReservationShape | null, next: ReservationShape): boolean {
    if (!blocksRoom(next)) return false;
    if (!prev) return true;
    if (!blocksRoom(prev)) return true;
    if (Number(prev.room_id) !== Number(next.room_id)) return true;
    if (dayOf(prev.check_in) !== dayOf(next.check_in)) return true;
    if (dayOf(prev.check_out) !== dayOf(next.check_out)) return true;
    return false;
}

// ---------------------------------------------------------------------------
// Nota de autorización y marcado de solapes (calendario)
// ---------------------------------------------------------------------------

/** "Solapamiento autorizado por <email> el DD/MM/AAAA HH:mm" (hora de America/Santiago). */
export function buildOverrideNote(email: string, when: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(when);
    const p: Record<string, string> = {};
    for (const x of parts) p[x.type] = x.value;
    return `Solapamiento autorizado por ${email} el ${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** Agrega una línea al final de las notas (sin dejar líneas vacías de más). */
export function appendNote(notes: string | null | undefined, line: string): string {
    const base = (notes ?? "").replace(/\s+$/, "");
    return base ? `${base}
${line}` : line;
}

export type MarkableReservation = OverlapReservation & { code?: string | null };

/**
 * Para el calendario: id de cada reserva que se solapa con otra de la misma habitación
 * -> códigos (o #id) de las reservas con las que se cruza. Misma regla que findOverlaps.
 */
export function overlapMap<T extends MarkableReservation>(reservations: T[], now: Date = new Date()): Map<number, string[]> {
    const out = new Map<number, string[]>();
    const byRoom = new Map<number, T[]>();
    for (const r of reservations) {
        if (r.room_id === null || r.room_id === undefined) continue;
        const list = byRoom.get(Number(r.room_id)) ?? [];
        list.push(r);
        byRoom.set(Number(r.room_id), list);
    }
    for (const [roomId, list] of byRoom) {
        for (const r of list) {
            // la propia reserva debe ocupar la habitación (no cancelada, no hold vencido, INTERNAL)
            const self = findOverlaps([r], { room_id: roomId, check_in: r.check_in, check_out: r.check_out }, now);
            if (self.length === 0) continue;
            const others = findOverlaps(list, { room_id: roomId, check_in: r.check_in, check_out: r.check_out, exclude_id: r.id }, now);
            if (others.length > 0) out.set(Number(r.id), others.map((o) => o.code || `#${o.id}`));
        }
    }
    return out;
}
