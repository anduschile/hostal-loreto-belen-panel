// src/lib/auth/server.ts
// Helpers de autenticación/autorización para rutas /api (servidor).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type PanelRole = "superadmin" | "recepcion" | "housekeeping";

export type PanelProfile = {
    role: string | null;
    full_name: string | null;
    is_active: boolean;
};

/** Usuario de la sesión actual (cookies), verificado contra Supabase Auth. */
export async function getSessionUser(): Promise<User | null> {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // En Route Handlers de solo lectura puede fallar; el middleware ya refresca la sesión.
                    }
                },
            },
        }
    );

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
}

/** Fila de hostal_users (por supabase_user_id), leída con service_role. */
export async function getUserProfile(userId: string): Promise<PanelProfile | null> {
    const admin = createClient();
    const { data, error } = await admin
        .from("hostal_users")
        .select("role, full_name, is_active")
        .eq("supabase_user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error leyendo hostal_users:", error.message);
        return null;
    }
    if (!data) return null;

    return {
        role: data.role ?? null,
        full_name: data.full_name ?? null,
        is_active: data.is_active === true,
    };
}

/** Rol del usuario solo si tiene fila activa en hostal_users; si no, null. */
export async function getUserRole(userId: string): Promise<string | null> {
    const profile = await getUserProfile(userId);
    if (!profile || !profile.is_active) return null;
    return profile.role;
}

type AuthOk = { ok: true; user: User; role: string | null };
type AuthFail = { ok: false; response: NextResponse };

/** Exige sesión válida y fila activa en hostal_users. 401 sin sesión, 403 sin fila activa. */
export async function requireUser(): Promise<AuthOk | AuthFail> {
    const user = await getSessionUser();
    if (!user) {
        return {
            ok: false,
            response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
        };
    }

    const profile = await getUserProfile(user.id);
    if (!profile || !profile.is_active) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Usuario sin acceso al panel" }, { status: 403 }),
        };
    }

    return { ok: true, user, role: profile.role };
}

/** Exige además que el rol esté en la lista. 403 si no. */
export async function requireRole(roles: PanelRole[]): Promise<AuthOk | AuthFail> {
    const result = await requireUser();
    if (!result.ok) return result;

    if (!result.role || !(roles as string[]).includes(result.role)) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 }),
        };
    }
    return result;
}
