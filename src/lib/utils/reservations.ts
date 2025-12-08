
/**
 * Generates a reservation code.
 * Format: R-YYMMDD-XXXX
 * Example: R-251206-1234
 */
export function generateReservationCode(roomId: number | string, checkIn: string): string {
    // Basic prefix
    let code = "R";

    // Add compact date YYMMDD
    try {
        const date = new Date(checkIn);
        const y = date.getFullYear().toString().slice(-2);
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        code += `-${y}${m}${d}`;
    } catch (e) {
        // Fallback to today if checkIn is invalid
        const now = new Date();
        code += `-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    }

    // Add random suffix (4 chars alphanumeric or just numeric for simplicity)
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();

    return `${code}-${suffix}`;
}
