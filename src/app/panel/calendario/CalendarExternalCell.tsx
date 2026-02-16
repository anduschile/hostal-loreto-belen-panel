"use client";

import { useState } from "react";
import { CalendarReservation } from "@/lib/data/calendar";
import ReservationBlock from "./ReservationBlock";
import { MoreHorizontal, X } from "lucide-react";
import { formatCurrencyCLP } from "@/lib/formatters";

type Props = {
    date: Date;
    reservations: CalendarReservation[];
    onReservationClick: (res: CalendarReservation) => void;
    viewMode?: "month" | "day" | "week";
};

export default function CalendarExternalCell({ date, reservations, onReservationClick, viewMode = "week" }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    // Limit based on view mode (Month has less space)
    const MAX_VISIBLE = viewMode === "month" ? 1 : 2;

    // Sort logic handled by parent or assumed correct. 
    // We just take the first N.
    const visibleReservations = reservations.slice(0, MAX_VISIBLE);
    const hiddenCount = reservations.length - visibleReservations.length;

    return (
        <div className="w-full h-full p-1 flex flex-col gap-1 relative group">

            {/* Visible Blocks */}
            {visibleReservations.map(res => (
                <div key={res.id} onClick={(e) => { e.stopPropagation(); }}>
                    <ReservationBlock
                        reservation={res}
                        style={{ position: "relative", width: "100%", height: "24px", fontSize: "10px" }}
                        onClick={onReservationClick}
                        viewMode="month" // Force compact view logic inside block
                    />
                </div>
            ))}

            {/* Overflow Indicator */}
            {hiddenCount > 0 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(true);
                    }}
                    className="mt-auto w-full text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1 py-0.5 flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors"
                >
                    <MoreHorizontal size={12} />
                    +{hiddenCount} más
                </button>
            )}

            {/* Popover / Overlay for Hidden Items */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]"
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                    />

                    {/* Popover Content */}
                    <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] bg-white rounded-xl shadow-2xl border border-gray-200 z-[70] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gray-50 px-3 py-2 border-b flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-700 uppercase">
                                {reservations.length} Derivaciones
                            </span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto p-2 space-y-2 bg-white custom-scrollbar">
                            {reservations.map(res => (
                                <div
                                    key={res.id}
                                    onClick={() => {
                                        setIsOpen(false);
                                        onReservationClick(res);
                                    }}
                                    className="p-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all group/item"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-gray-800 group-hover/item:text-blue-700">
                                            {res.guest_name}
                                        </span>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${res.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {res.status}
                                        </span>
                                    </div>

                                    <div className="text-xs text-gray-500 flex flex-col gap-0.5">
                                        {res.company_name && (
                                            <span className="font-medium text-blue-600">{res.company_name}</span>
                                        )}
                                        <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
                                            <span>{res.check_in} ➝ {res.check_out}</span>
                                            <span className="font-mono font-bold text-gray-600">{formatCurrencyCLP(res.total_price)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
