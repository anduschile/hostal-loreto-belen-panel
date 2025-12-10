
/**
 * Retorna la URL base de la aplicación.
 * Prioridad:
 * 1. NEXT_PUBLIC_APP_URL (definida manualmente en Vercel/Env)
 * 2. APP_URL (backend only)
 * 3. VERCEL_URL (automática de Vercel) -> se le antepone https://
 * 4. http://localhost:3000 (dev default)
 */
export function getAppBaseUrl() {
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    }

    if (process.env.APP_URL) {
        return process.env.APP_URL.replace(/\/+$/, "");
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return "http://localhost:3000";
}
