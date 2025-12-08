/**
 * Format a number as Chilean Peso (CLP) currency.
 * Safe to use with undefined/null/NaN - returns "—" or fallback.
 */
export const formatCurrencyCLP = (value: unknown, fallback = "—"): string => {
    if (value === null || value === undefined) {
        return fallback;
    }

    const num = Number(value);
    if (Number.isNaN(num)) {
        return fallback;
    }

    // Handle potentially string-encoded numbers safely or just ensure type is number
    try {
        return num.toLocaleString("es-CL", {
            style: "currency",
            currency: "CLP",
            minimumFractionDigits: 0,
        });
    } catch (e) {
        console.error("Error formatting currency:", e);
        return fallback;
    }
};

/**
 * Format a date string or object to "es-CL" locale date string.
 * Safe to use with undefined/null/invalid dates - returns "—" or fallback.
 */
export const formatDateCL = (value: unknown, fallback = "—"): string => {
    if (!value) return fallback;

    let date: Date;

    if (value instanceof Date) {
        date = value;
    } else if (typeof value === "string") {
        // Attempt to handle date only strings (YYYY-MM-DD) to prevent timezone shifts if needed,
        // but Date(string) usually works fine for display if we don't care about specific TZ midnight bugs.
        // For simplicity and safety, we rely on Date constructor but check validity.
        // Note: ISO strings usually work well.
        date = new Date(value);
    } else {
        return fallback;
    }

    if (Number.isNaN(date.getTime())) {
        // Try to see if it's a non-standard string that we can just display?
        // The user requested to use the helper instead of raw strings.
        // If it's a string like "2024-01-01", keep as is? 
        // Usually if Date fails, we fallback.
        return typeof value === "string" && value.trim() !== "" ? value : fallback;
    }

    try {
        // "es-CL" is DD-MM-YYYY usually
        return date.toLocaleDateString("es-CL");
    } catch (e) {
        console.warn("Error formatting date:", e);
        return fallback;
    }
};
