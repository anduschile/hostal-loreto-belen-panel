// Formatos de fecha para la API pública y el panel (sin dependencias de Node: se usa también en el navegador).

const TZ = "America/Santiago";

function partsSantiago(iso: string): Record<string, string> | null {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(d);
    const out: Record<string, string> = {};
    for (const p of parts) out[p.type] = p.value;
    return out;
}

/** "DD/MM/AAAA HH:mm" en hora de America/Santiago ("" si la fecha es inválida). */
export function formatSantiagoFull(iso: string): string {
    const p = partsSantiago(iso);
    return p ? `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}` : "";
}

/** "DD/MM HH:mm" en hora de America/Santiago ("" si la fecha es inválida). */
export function formatSantiagoShort(iso: string): string {
    const p = partsSantiago(iso);
    return p ? `${p.day}/${p.month} ${p.hour}:${p.minute}` : "";
}

/** "YYYY-MM-DD" a "DD/MM/AAAA". */
export function formatDMY(isoDay: string): string {
    const [y, m, d] = String(isoDay).slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
}
