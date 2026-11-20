"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Define UserRole
export type UserRole = "superadmin" | "recepcion" | "housekeeping";

export type AuthUser = {
    id: string;
    email: string | null;
    full_name?: string | null;
};

type AuthContextValue = {
    user: AuthUser | null;
    role: UserRole | null;
    loading: boolean;
    accessError: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const NO_ACCESS_MESSAGE = "Usuario sin acceso al panel";

// --- Cliente de Supabase para el navegador: la sesión vive en cookies (legibles por el servidor) ---
let supabaseBrowserClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
    if (supabaseBrowserClient) return supabaseBrowserClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error(
            "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno."
        );
    }

    supabaseBrowserClient = createBrowserClient(url, anonKey);
    return supabaseBrowserClient;
}

type MeResult =
    | { status: "ok"; role: UserRole; full_name: string | null }
    | { status: "denied" }
    | { status: "error" };

// El rol y el nombre se obtienen del servidor (/api/me), no desde el navegador contra la base de datos.
async function fetchMe(): Promise<MeResult> {
    try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) return { status: "denied" };
        if (!res.ok) return { status: "error" };
        const body = await res.json();
        return { status: "ok", role: body.role as UserRole, full_name: body.full_name ?? null };
    } catch {
        return { status: "error" };
    }
}

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState<string | null>(null);
    const router = useRouter();

    const supabase = getSupabaseClient();

    // Cargar sesión inicial; rol y nombre vienen de /api/me
    useEffect(() => {
        let isMounted = true;

        async function resolveProfile(authUser: { id: string; email?: string | null }) {
            const me = await fetchMe();
            if (!isMounted) return;

            if (me.status === "denied") {
                // Sesión de Supabase válida pero sin fila activa en hostal_users
                await supabase.auth.signOut();
                if (!isMounted) return;
                setUser(null);
                setRole(null);
                setAccessError(NO_ACCESS_MESSAGE);
                return;
            }

            if (me.status === "error") {
                setUser(null);
                setRole(null);
                return;
            }

            setAccessError(null);
            setUser({
                id: authUser.id,
                email: authUser.email ?? null,
                full_name: me.full_name,
            });
            setRole(me.role);
        }

        async function loadSession() {
            setLoading(true);
            try {
                const {
                    data: { user },
                    error,
                } = await supabase.auth.getUser();

                if (error || !user) {
                    if (isMounted) {
                        setUser(null);
                        setRole(null);
                    }
                    return;
                }

                await resolveProfile(user);
            } catch (err) {
                console.error("Error en loadSession:", err);
                if (isMounted) {
                    setUser(null);
                    setRole(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadSession();

        // Suscribirse a cambios de auth (solo login/logout; la carga inicial ya la hace loadSession)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;

            if (event === "SIGNED_OUT" || !session?.user) {
                setUser(null);
                setRole(null);
                return;
            }

            if (event === "SIGNED_IN") {
                // Fuera del callback para no bloquear el cliente de Supabase
                setTimeout(() => {
                    resolveProfile(session.user);
                }, 0);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            if (!data.user) throw new Error("No user returned after sign in");

            // Verifica en el servidor que el usuario tenga acceso al panel
            const me = await fetchMe();
            if (me.status !== "ok") {
                await supabase.auth.signOut();
                throw new Error(
                    me.status === "denied" ? NO_ACCESS_MESSAGE : "No se pudo verificar el acceso al panel"
                );
            }

            router.push("/panel/libro-dia");
        } catch (e) {
            console.error(e);
            throw e; // Login page handles this error
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        setLoading(true);
        try {
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
            router.push("/login"); // send to login
        } finally {
            setLoading(false);
        }
    };

    const value: AuthContextValue = {
        user,
        role,
        loading,
        accessError,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth debe usarse dentro de un AuthProvider");
    }
    return ctx;
}
