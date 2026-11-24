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
export const IGNORED_STATUSES = ["cancelled", "cancelada", "checked_out", "salida"] as const;

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
