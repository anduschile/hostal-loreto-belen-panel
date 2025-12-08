"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

type UserRole = "superadmin" | "recepcion" | "housekeeping";

export type AuthUser = {
    id: string;
    email: string | null;
    full_name?: string | null;
};

type AuthContextValue = {
    user: AuthUser | null;
    role: UserRole | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// --- Crear cliente de Supabase para el lado cliente ---
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

    supabaseBrowserClient = createClient(url, anonKey);
    return supabaseBrowserClient;
}

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const supabase = getSupabaseClient();

    // Cargar sesión inicial y rol desde hostal_users
    useEffect(() => {
        let isMounted = true;

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
                        setLoading(false);
                    }
                    return;
                }

                // IMPORTANTE:
                // Asumimos que la tabla hostal_users tiene una columna id que coincide con auth.user.id
                // y una columna role con valores 'superadmin' | 'recepcion' | 'housekeeping'.
                const { data: profile, error: profileError } = await supabase
                    .from("hostal_users")
                    .select("role, full_name")
                    .eq("id", user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error("Error cargando perfil hostal_users:", profileError.message);
                }

                // Usuario autenticado
                const authUser: AuthUser = {
                    id: user.id,
                    email: user.email ?? null,
                    full_name: profile?.full_name ?? null,
                };

                const userRole: UserRole | null =
                    profile?.role && ["superadmin", "recepcion", "housekeeping"].includes(profile.role)
                        ? (profile.role as UserRole)
                        : "recepcion"; // por defecto, recepcion

                if (isMounted) {
                    setUser(authUser);
                    setRole(userRole);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error en loadSession:", err);
                if (isMounted) {
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                }
            }
        }

        loadSession();

        // Suscribirse a cambios de auth
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isMounted) return;

            if (!session?.user) {
                setUser(null);
                setRole(null);
                return;
            }

            // Opcional: recargar rol cada vez que cambie la sesión, o reusar la info
            // Por simplicidad, seteamos lo basico, y loadSession correra de nuevo o podemos hacer fetch
            // pero lo mas robusto es hacer fetch siempre si cambio el usuario
            // Aunque este listener puede dispararse con la misma sesion

            // Para asegurar full_name, idealmente hacemos fetch
            (async () => {
                const { data: profile } = await supabase
                    .from("hostal_users")
                    .select("role, full_name")
                    .eq("id", session.user!.id)
                    .maybeSingle();

                const authUser: AuthUser = {
                    id: session.user!.id,
                    email: session.user!.email ?? null,
                    full_name: profile?.full_name ?? null
                };

                const userRole: UserRole | null =
                    profile?.role && ["superadmin", "recepcion", "housekeeping"].includes(profile.role)
                        ? (profile.role as UserRole)
                        : "recepcion";

                if (isMounted) {
                    setUser(authUser);
                    setRole(userRole);
                }
            })();
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

            // Forzar recarga de estado o dejar que el listener actúe
            // Pero el listener a veces tiene delay.
            // Hacemos router push
            router.push("/panel");
        } catch (e) {
            console.error(e);
            throw e;
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
