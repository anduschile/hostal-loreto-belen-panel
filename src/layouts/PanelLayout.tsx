"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { name: "Dashboard", path: "/panel/dashboard" },
  { name: "Reservas", path: "/panel/reservas" },
  { name: "Habitaciones", path: "/panel/habitaciones" },
  { name: "Empresas", path: "/panel/empresas" },
  { name: "Housekeeping", path: "/panel/housekeeping" },
  { name: "Pagos", path: "/panel/pagos" },
  { name: "Auditoría", path: "/panel/auditoria" },
  { name: "Usuarios", path: "/panel/usuarios" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r shadow-sm p-4 flex flex-col gap-2">
        <h1 className="text-xl font-bold mb-4">Hostal Natales</h1>

        {menu.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`p-2 rounded-md font-medium ${
              pathname === item.path
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-200"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
