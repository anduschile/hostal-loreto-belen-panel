// Efectos de un cambio de estado sobre solicitudes web: limpiar el vencimiento (hold) y avisar al huésped.
// Funciones sin dependencias de Next para poder probarlas con una base y un envío simulados.

import type { ConfirmationEmailData } from "../public-api/emails";

export type StatusChangePrev = { status?: string | null; source?: string | null; notes?: string | null };

export type StatusPlan = {
    /** Poner hold_expires_at en null. */
    clearHold: boolean;
    /** Enviar el correo de confirmación al huésped. */
    sendConfirmation: boolean;
};

const norm = (s: string | null | undefined) => String(s ?? "").trim().toLowerCase();

/**
 * - confirmed + source web: limpia el hold y envía correo (solo si antes no estaba confirmada,
 *   para que repetir la acción no reenvíe el correo).
 * - rechazada: limpia el hold; nunca envía correo.
 */
export function planStatusChange(prev: StatusChangePrev | null, nextStatus: string): StatusPlan {
    const next = norm(nextStatus);
    const isWeb = norm(prev?.source) === "web";
    if (next === "confirmed" && isWeb) {
        return { clearHold: true, sendConfirmation: norm(prev?.status) !== "confirmed" };
    }
    if (next === "rechazada") return { clearHold: true, sendConfirmation: false };
    return { clearHold: false, sendConfirmation: false };
}

export function buildStatusUpdatePayload(
    status: string,
    plan: StatusPlan,
    notes?: string | null
): { status: string; notes?: string; hold_expires_at?: null } {
    const payload: { status: string; notes?: string; hold_expires_at?: null } = { status };
    if (notes != null) payload.notes = notes;
    if (plan.clearHold) payload.hold_expires_at = null;
    return payload;
}

// Cliente mínimo de Supabase que se usa aquí (el real lo cumple).
export type ReservationReader = {
    from: (table: string) => {
        select: (cols: string) => {
            eq: (col: string, val: number) => { maybeSingle: () => PromiseLike<{ data: any; error: { message: string } | null }> };
        };
    };
};

const first = (v: any) => (Array.isArray(v) ? v[0] : v);

/** Datos para el correo de confirmación (código, fechas, tipo de habitación, personas, huésped). */
export async function loadConfirmationData(db: ReservationReader, id: number): Promise<ConfirmationEmailData | null> {
    const { data, error } = await db
        .from("hostal_reservations")
        .select("code, check_in, check_out, adults, children, hostal_rooms ( room_type ), hostal_guests ( full_name, email )")
        .eq("id", id)
        .maybeSingle();
    if (error || !data) return null;
    const guest = first(data.hostal_guests);
    const room = first(data.hostal_rooms);
    const email = String(guest?.email ?? "").trim();
    if (!email) return null;
    return {
        code: String(data.code ?? `#${id}`),
        check_in: String(data.check_in).slice(0, 10),
        check_out: String(data.check_out).slice(0, 10),
        room_type: String(room?.room_type ?? ""),
        adults: Number(data.adults ?? 1),
        children: Number(data.children ?? 0),
        full_name: String(guest?.full_name ?? ""),
        email,
    };
}

/** Envía el correo de confirmación. Nunca lanza. Devuelve true si se envió. */
export async function notifyConfirmation(
    db: ReservationReader,
    id: number,
    send: (d: ConfirmationEmailData) => Promise<boolean>
): Promise<boolean> {
    try {
        const data = await loadConfirmationData(db, id);
        if (!data) {
            console.error("[status] Confirmación sin correo: la reserva no tiene email de huésped o no se pudo leer.");
            return false;
        }
        return await send(data);
    } catch {
        console.error("[status] Error inesperado enviando el correo de confirmación.");
        return false;
    }
}
