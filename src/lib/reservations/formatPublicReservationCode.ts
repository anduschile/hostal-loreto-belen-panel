// src/lib/reservations/formatPublicReservationCode.ts

export function formatPublicReservationCode(reservation: {
    id?: number | string | null;
    code?: string | null;
}) {
    // Si hay ID numérico, generamos LB-00000
    if (reservation.id != null) {
        const idNum = Number(reservation.id);
        if (!Number.isNaN(idNum) && idNum > 0) {
            const padded = idNum.toString().padStart(5, "0");
            return `LB-${padded}`;
        }
    }

    // Si no hay ID válido, usamos el code original
    if (reservation.code) return reservation.code;

    return "LB-SIN-CODIGO";
}
