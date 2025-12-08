import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NOTA:
// Este middleware, por ahora, no usa Supabase directamente.
// La protección detallada del panel se está manejando
// en el layout y en el AuthContext del frontend.
// Más adelante se puede reimplantar una versión server-side
// usando la API correcta de Supabase para middleware.

export function middleware(req: NextRequest) {
    // Si en el futuro quieres volver a proteger /panel aquí,
    // este es el lugar para hacerlo.
    return NextResponse.next();
}

// Aplica el middleware solo a las rutas que nos interesen
export const config = {
    matcher: ["/panel/:path*", "/login"],
};
