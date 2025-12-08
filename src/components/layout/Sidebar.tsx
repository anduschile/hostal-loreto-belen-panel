"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    CalendarDays,
    NotebookTabs,
    BookOpenCheck,
    Users,
    Building2,
    CreditCard,
    BarChart3,
    Settings,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
    { label: "Panel", href: "/panel", icon: LayoutDashboard },
    { label: "Calendario", href: "/panel/calendario", icon: CalendarDays },
    { label: "Reservas", href: "/panel/reservas", icon: NotebookTabs },
    { label: "Libro del Día", href: "/panel/libro-dia", icon: BookOpenCheck },
    { label: "Huéspedes", href: "/panel/huespedes", icon: Users },
    { label: "Empresas", href: "/panel/empresas", icon: Building2 },
    { label: "Pagos", href: "/panel/pagos", icon: CreditCard },
    { label: "Reportes", href: "/panel/reportes", icon: BarChart3 },
    { label: "Usuarios", href: "/panel/usuarios", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Mobile Trigger */}
            <button
                onClick={toggleSidebar}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded shadow-lg"
            >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Overlay Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed md:translate-x-0 top-0 left-0 z-40
                    h-screen w-64 bg-slate-900 text-slate-100 flex flex-col
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                `}
            >
                {/* Branding */}
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <Image
                        src="/logo-pagina.png"
                        alt="Hostal Loreto Belén"
                        width={40}
                        height={40}
                        className="rounded-full shadow-sm object-cover bg-white"
                        priority
                    />
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-100 leading-tight">
                            Hostal Loreto Belén
                        </span>
                        <span className="text-xs text-emerald-300/80">
                            Panel de administración
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        // Check if active: exact match for /panel or startsWith for subroutes (e.g., /panel/calendario)
                        // Special case: /panel should also be active if pathname is /panel/dashboard (if internal redirect happens client-side)
                        // but since we redirect logic, just standard startsWith/exact match is okay.
                        // However, to prevent "/panel" matching everything, we do exact match for root "/panel".
                        const isActive = item.href === "/panel"
                            ? pathname === "/panel" || pathname === "/panel/dashboard"
                            : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                    ${isActive
                                        ? "bg-emerald-900/40 text-emerald-400 border-l-2 border-emerald-400 shadow-sm"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-emerald-300 border-l-2 border-transparent"
                                    }
                                `}
                            >
                                <item.icon size={18} className={isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-300"} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer User Info */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold ring-1 ring-slate-600">
                            U
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-200">Usuario</span>
                            <span className="text-xs text-slate-500">Administrador</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

export { navItems as menuItems };
