// src/lib/supabase/server.ts

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente de Supabase SOLO para servidor. Usa siempre la service_role.
// No hay respaldo a la clave anon: si falta la variable, falla con un error claro.
export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new Error(
            "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL (requerida por el cliente de servidor de Supabase)."
        );
    }
    if (!key) {
        throw new Error(
            "Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY: el cliente de servidor de Supabase ya no usa la clave anon."
        );
    }

    return createSupabaseClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
