"use client";

import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from "lucide-react";
import { useState } from "react";

type ViewMode = "day" | "week" | "month";

type Props = {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    onFilterChange: (filters: { status: string; roomType: string }) => void;
    loading?: boolean;
};

export default function CalendarHeader({ currentDate, onDateChange, viewMode, onViewModeChange, onFilterChange, loading }: Props) {
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");

    const getTitle = () => {
        const month = format(currentDate, "MMMM", { locale: es });
        const year = format(currentDate, "yyyy");

        if (viewMode === "day") {
            return `${format(currentDate, "d 'de' MMMM, yyyy", { locale: es })}`;
        }
        if (viewMode === "week") {
            return `Semana del ${format(currentDate, "d", { locale: es })} de ${month} ${year}`;
        }
        return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
    };

    const handlePrev = () => {
        if (viewMode === "day") onDateChange(subDays(currentDate, 1));
        else if (viewMode === "week") onDateChange(subWeeks(currentDate, 1));
        else onDateChange(subMonths(currentDate, 1));
    };

    const handleNext = () => {
        if (viewMode === "day") onDateChange(addDays(currentDate, 1));
        else if (viewMode === "week") onDateChange(addWeeks(currentDate, 1));
        else onDateChange(addMonths(currentDate, 1));
    };

    const handleFilterUpdate = (key: "status" | "type", value: string) => {
        if (key === "status") {
            setStatusFilter(value);
            onFilterChange({ status: value, roomType: typeFilter });
        } else {
            setTypeFilter(value);
            onFilterChange({ status: statusFilter, roomType: value });
        }
    };

    return (
        <div className="bg-white border-b px-4 py-3 flex flex-col gap-4 shadow-sm z-20 sticky top-0">

            {/* TOP ROW */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button onClick={handlePrev} className="p-1.5 hover:bg-white rounded-md text-gray-600">
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => onDateChange(new Date())}
                            className="px-3 py-1 text-xs font-bold text-gray-600 hover:text-blue-600"
                        >
                            Hoy
                        </button>
                        <button onClick={handleNext} className="p-1.5 hover:bg-white rounded-md text-gray-600">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <h2 className="text-lg font-bold text-gray-800 capitalize min-w-[200px] flex items-center gap-2">
                        {loading && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                        {getTitle()}
                    </h2>

                    <div className="relative group">
                        <CalendarIcon size={18} className="text-gray-400 group-hover:text-blue-600 cursor-pointer" />
                        <input
                            type="date"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            value={format(currentDate, "yyyy-MM-dd")}
                            onChange={(e) => {
                                if (e.target.value) onDateChange(parseISO(e.target.value));
                            }}
                        />
                    </div>
                </div>

                {/* VIEW SWITCHER */}
                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    {(["day", "week", "month"] as ViewMode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => onViewModeChange(m)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize ${viewMode === m
                                    ? "bg-white shadow-sm text-blue-600"
                                    : "text-gray-500 hover:text-gray-900"
                                }`}
                        >
                            {m === "day" ? "Día" : m === "week" ? "Semana" : "Mes"}
                        </button>
                    ))}
                </div>
            </div>

            {/* BOTTOM ROW */}
            <div className="flex flex-wrap items-center gap-4 text-sm border-t pt-3">
                <div className="flex items-center gap-2 text-gray-500">
                    <Filter size={14} />
                    <span className="text-xs font-bold uppercase">Filtros:</span>
                </div>

                {/* STATUS FILTER */}
                <select
                    value={statusFilter}
                    onChange={(e) => handleFilterUpdate("status", e.target.value)}
                    className="bg-gray-50 border-gray-200 rounded text-xs py-1 px-2"
                >
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="checked_in">In-House</option>
                    <option value="checked_out">Check-Out</option>
                    <option value="cancelled">Cancelada</option>
                </select>

                {/* ROOM TYPE FILTER — CORREGIDO */}
                <select
                    value={typeFilter}
                    onChange={(e) => handleFilterUpdate("type", e.target.value)}
                    className="bg-gray-50 border-gray-200 rounded text-xs py-1 px-2"
                >
                    <option value="all">Todas las habitaciones</option>
                    <option value="matrimonial">Matrimonial</option>
                    <option value="doble">Doble</option>
                    <option value="triple">Triple</option>
                    <option value="cuadruple">Cuádruple</option>
                </select>
            </div>
        </div>
    );
}
