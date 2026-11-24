import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@/lib/supabase/server";

// Protege TODO el sitio excepto /login, el prefijo /api/public (API pública; ver lib/public-api) y archivos estáticos/públicos.
// 1) Refresca la sesión (cookies) con el patrón oficial de @supabase/ssr.
// 2) Exige sesión válida y fila activa en hostal_users (service_role).
//    - Sin sesión: /api -> 401 JSON; páginas -> redirige a /login.
//    - Con sesión pero sin fila activa: /api -> 403 JSON; páginas -> redirige a /login.

export async function middleware(request: NextRequest) {
    const isApi = request.nextUrl.pathname.startsWith("/api/");

    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Importante: no poner lógica entre createServerClient y getUser().
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Copia las cookies refrescadas a cualquier respuesta de rechazo.
    const deny = (status: 401 | 403 | 500, message: string) => {
        const target = isApi
            ? NextResponse.json({ error: message }, { status })
            : NextResponse.redirect(new URL("/login", request.url));
        response.cookies.getAll().forEach((c) => target.cookies.set(c));
        return target;
    };

    if (!user) {
        return deny(401, "No autenticado");
    }

    try {
        const admin = createServiceClient();
        const { data, error } = await admin
            .from("hostal_users")
            .select("id")
            .eq("supabase_user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (error) {
            console.error("Middleware: error leyendo hostal_users:", error.message);
            return deny(403, "Usuario sin acceso al panel");
        }
        if (!data) {
            return deny(403, "Usuario sin acceso al panel");
        }
    } catch (e) {
        console.error("Middleware: error de configuración:", e);
        return deny(500, "Error de configuración del servidor");
    }

    return response;
}

// Todo excepto /login, _next/static, _next/image, favicon y archivos públicos con extensión.
export const config = {
    matcher: [
        "/((?!login(?:/|$)|api/public(?:/|$)|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|css|js|map|txt|webmanifest)$).*)",
    ],
};
