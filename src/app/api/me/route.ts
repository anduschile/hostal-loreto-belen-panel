import { NextResponse } from "next/server";
import { getSessionUser, getUserProfile } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["superadmin", "recepcion", "housekeeping"];

// GET /api/me -> { full_name, role } del usuario de la sesión.
// 401 sin sesión; 403 si no tiene fila activa en hostal_users o su rol no es válido.
export async function GET() {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    if (!profile || !profile.is_active || !profile.role || !VALID_ROLES.includes(profile.role)) {
        return NextResponse.json({ error: "Usuario sin acceso al panel" }, { status: 403 });
    }

    return NextResponse.json({ full_name: profile.full_name, role: profile.role });
}
