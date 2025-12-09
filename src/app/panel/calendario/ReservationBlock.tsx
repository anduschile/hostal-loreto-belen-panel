"use client";

import { CalendarReservation } from "@/lib/data/calendar";
import { formatCurrencyCLP } from "@/lib/formatters";
import { useState, useRef } from "react";
import { User, Building2, Clock, Banknote, FileText } from "lucide-react";

type Props = {
    reservation: CalendarReservation;
    style?: React.CSSProperties;
    onClick: (res: CalendarReservation) => void;
    viewMode?: "day" | "week" | "month";
};

// Modern SaaS Color Palette for Statuses
const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-100 border-l-4 border-amber-400 text-amber-900 hover:bg-amber-200",
    confirmed: "bg-emerald-100 border-l-4 border-emerald-500 text-emerald-900 hover:bg-emerald-200",
    checked_in: "bg-blue-100 border-l-4 border-blue-500 text-blue-900 hover:bg-blue-200",
    checked_out: "bg-slate-100 border-l-4 border-slate-400 text-slate-700 hover:bg-slate-200",
    blocked: "bg-red-100 border-l-4 border-red-500 text-red-900 hover:bg-red-200",
    cancelled: "bg-gray-50 border-gray-400 text-gray-400 opacity-60 line-through border-l-2",
};

export default function ReservationBlock({ reservation, style, onClick, viewMode }: Props) {
    const [hover, setHover] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const blockRef = useRef<HTMLDivElement>(null);
    const baseClasses = STATUS_STYLES[reservation.status] || "bg-gray-100 text-gray-700 border-l-4 border-gray-400";

    const handleMouseEnter = (e: React.MouseEvent) => {
        setHover(true);
        if (blockRef.current) {
            const rect = blockRef.current.getBoundingClientRect();
            // Basic logic: show below or to the right. 
            // Fixed position relative to viewport.
            let top = rect.bottom + 5;
            let left = rect.left + 20;

            // Boundary checks (simple)
            if (left + 320 > window.innerWidth) left = window.innerWidth - 340;
            if (top + 400 > window.innerHeight) top = rect.top - 100; // Flip up if needed

            setTooltipPos({ top, left });
        }
    };

    // Detect "Day View" via mode or width
    const isWide = viewMode === "day" || (style?.width && parseInt(String(style.width)) > 200);

    const checkInDate = reservation.check_in;
    const checkOutDate = reservation.check_out;

    const paymentMatch = reservation.notes?.match(/\[Pago: (.*?)\]/);
    const paymentMethod = paymentMatch ? paymentMatch[1] : "N/A";

    return (
        <div
            ref={blockRef}
            className={`absolute top-1 bottom-1 rounded-r-md shadow-sm text-xs font-medium cursor-pointer transition-all duration-200 px-2 flex flex-col justify-center gap-0.5 z-10 overflow-hidden ${baseClasses} ${hover ? "z-30 shadow-lg -translate-y-0.5" : ""}`}
            style={style || { position: 'relative', width: '100%', height: '100%' }}
            onClick={(e) => {
                e.stopPropagation();
                onClick(reservation);
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setHover(false)}
        >
            {/* --- CONTENT RENDER --- */}
            {isWide ? (
                // DAY VIEW LAYOUT (Rich Card)
                <div className="flex items-center justify-between h-full px-2">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col min-w-[120px]">
                            <span className="font-bold text-sm leading-none">{reservation.guest_name}</span>
                            {reservation.company_name && (
                                <span className="text-xs opacity-80 flex items-center gap-1 mt-1">
                                    <Building2 size={10} /> {reservation.company_name}
                                </span>
                            )}
                        </div>
                        <div className="h-6 w-px bg-current opacity-20 mx-2 hidden md:block"></div>
                        <div className="hidden md:flex flex-col text-[10px] opacity-80">
                            <span className="flex items-center gap-1"><User size={10} /> {reservation.adults + (reservation.children || 0)} Pax</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {checkInDate} ➝ {checkOutDate}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <span className="block font-bold text-sm">{formatCurrencyCLP(reservation.total_price)}</span>
                            <span className="block text-[9px] uppercase opacity-70">{reservation.invoice_status === 'invoiced' ? 'Facturado' : 'Pendiente'}</span>
                        </div>
                        <span className="px-2 py-1 rounded-full bg-white/50 text-[10px] font-bold uppercase border border-black/5">
                            {reservation.status}
                        </span>
                    </div>
                </div>
            ) : (
                // WEEK/MONTH VIEW LAYOUT (Compact)
                <div className="flex flex-col h-full justify-center px-1">
                    <div className="font-bold truncate leading-tight flex items-center gap-1 text-[10px] md:text-xs">
                        {reservation.guest_name || "Sin huésped"}
                    </div>

                    <div className="text-[9px] md:text-[10px] text-gray-700/80 dark:text-gray-200/80 truncate flex items-center gap-0.5">
                        {reservation.company_name_snapshot
                            || reservation.company_name
                            || (reservation.company_id ? "Empresa" : "Particular")}
                    </div>

                    {/* Price - hidden on very small blocks/mobile if needed, or kept absolute */}
                    {(style?.width && parseInt(String(style.width)) > 50) && (
                        <div className="absolute bottom-0.5 right-1 text-[8px] font-bold opacity-60 hidden sm:block">
                            {formatCurrencyCLP(reservation.total_price).replace("$", "")}
                        </div>
                    )}
                </div>
            )}

            {/* --- TOOLTIP --- */}
            {hover && (
                <div
                    className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-0 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: tooltipPos.top + "px",
                        left: tooltipPos.left + "px"
                    }}
                >
                    <div className={`h-2 w-full rounded-t-xl ${baseClasses.split(" ")[0]} ${baseClasses.split(" ")[2]}`}></div>
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-lg font-bold text-gray-800 leading-tight">{reservation.guest_name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-600 uppercase tracking-wider border">{reservation.status}</span>
                                    {reservation.source && <span className="text-[10px] text-gray-400 uppercase">Via {reservation.source}</span>}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-blue-600 text-lg">{formatCurrencyCLP(reservation.total_price)}</span>
                                <span className="text-[10px] text-gray-400 uppercase">{reservation.invoice_status === 'invoiced' ? 'Facturado' : 'Pendiente'}</span>
                            </div>
                        </div>

                        {reservation.company_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                                <Building2 size={14} className="text-blue-500" />
                                <span className="font-semibold">{reservation.company_name}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 border-t pt-2">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Entrada</p>
                                <p className="font-medium text-gray-900 flex items-center gap-1"><Clock size={12} /> {checkInDate}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Salida</p>
                                <p className="font-medium text-gray-900 flex items-center gap-1"><Clock size={12} /> {checkOutDate}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Huéspedes</p>
                                <p className="font-medium text-gray-900 flex items-center gap-1">
                                    <User size={12} /> {reservation.adults} Ad. / {reservation.children} Ni.
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Pago</p>
                                <p className="font-medium text-gray-900 flex items-center gap-1">
                                    <Banknote size={12} /> {paymentMethod}
                                </p>
                            </div>
                        </div>

                        {reservation.notes && (
                            <div className="text-xs text-gray-500 italic border-t pt-2 mt-1 bg-yellow-50/50 p-2 rounded">
                                <div className="flex gap-1 mb-1 font-bold text-yellow-700 uppercase text-[9px]">
                                    <FileText size={10} /> Notas
                                </div>
                                <p className="line-clamp-3 leading-relaxed">{reservation.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
