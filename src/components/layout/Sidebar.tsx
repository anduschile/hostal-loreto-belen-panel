"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    CalendarDays,
    BookOpen,
    BedDouble,
    Users,
    CreditCard,
    ClipboardCheck,
    FileText,
    X,
} from "lucide-react";

export const menuItems = [
    { name: "Escritorio", path: "/panel/dashboard", icon: LayoutDashboard },
    { name: "Calendario", path: "/panel/calendario", icon: CalendarDays },
    { name: "Libro del Día", path: "/panel/libro-dia", icon: BookOpen },
    { name: "Reservas", path: "/panel/reservas", icon: ClipboardCheck },
    {
        name: "Libro de Pasajeros",
        path: "/panel/registro-huespedes",
        icon: FileText,
    },
    { name: "Pagos", path: "/panel/pagos", icon: CreditCard },
    { name: "Habitaciones", path: "/panel/habitaciones", icon: BedDouble },
    { name: "Huéspedes", path: "/panel/huespedes", icon: Users },
];

type SidebarProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 z-50 h-screen w-64 
          bg-slate-900/95 text-white border-r border-slate-800
          transition-transform duration-300 ease-in-out shadow-2xl
          lg:translate-x-0 lg:static
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
            >
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-md flex items-center justify-center overflow-hidden">
                            {/* Ajusta el src al nombre que le des al archivo en /public */}
                            <Image
                                src="/logo-pagina.png"
                                alt="Hostal Loreto Belén"
                                width={36}
                                height={36}
                                className="object-contain"
                            />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] uppercase tracking-[0.16em] text-lime-300">
                                Hostal
                            </span>
                            <span className="text-sm font-bold text-white tracking-wide">
                                Loreto Belén
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="lg:hidden text-slate-400 hover:text-white"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
                    <p className="px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] mb-2 mt-2">
                        Principal
                    </p>

                    {menuItems.map((item) => {
                        const isActive = pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => {
                                    if (window.innerWidth < 1024) onClose();
                                }}
                                className={`
                  group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isActive
                                        ? "bg-lime-400 text-slate-900 shadow-md shadow-lime-900/20"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }
                `}
                            >
                                <item.icon
                                    size={20}
                                    className={
                                        isActive
                                            ? "text-slate-900"
                                            : "text-slate-400 group-hover:text-white"
                                    }
                                />
                                {item.name}
                            </Link>
                        );
                    })}

                    {/* Usuario */}
                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <div className="px-4 py-2">
                            <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-[0.16em]">
                                Usuario
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                                    AD
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-100">Admin</p>
                                    <p className="text-xs text-slate-500">admin@hostal.cl</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </aside>
        </>
    );
}
