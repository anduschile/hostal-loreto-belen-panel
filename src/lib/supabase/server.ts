// src/lib/supabase/server.ts

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Función que usa las variables de entorno para crear el cliente de Supabase
export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Puedes usar la service role en el servidor o el ANON KEY.
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        throw new Error(
            "Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE keys"
        );
    }

    return createSupabaseClient(url, key);
}
