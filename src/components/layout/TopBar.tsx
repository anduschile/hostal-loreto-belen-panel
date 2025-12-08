"use client";

import { Menu, Bell } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TopBarProps = {
    onMenuClick: () => void;
    title?: string;
};

export default function TopBar({ onMenuClick, title }: TopBarProps) {
    const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
    // Capitalize first letter
    const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);

    return (
        <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
                >
                    <Menu size={24} />
                </button>
                <h2 className="text-xl font-bold text-gray-800 hidden sm:block">
                    {title || "Panel de Control"}
                </h2>
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
                {/* Date Badge */}
                <div className="hidden md:flex items-center px-3 py-1 bg-gray-50 rounded-full border text-sm text-gray-600 font-medium">
                    {formattedDate}
                </div>

                {/* Notifications (Mock) */}
                <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
            </div>
        </header>
    );
}
