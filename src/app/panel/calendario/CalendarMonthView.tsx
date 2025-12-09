"use client";

import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRoom, CalendarReservation } from "@/lib/data/calendar";
import ReservationBlock from "./ReservationBlock";

type Props = {
    currentDate: Date;
    rooms: CalendarRoom[];
    reservations: CalendarReservation[];
    onReservationClick: (res: CalendarReservation) => void;
    onEmptyClick: (date: Date, roomId: number) => void;
};

export default function CalendarMonthView({ currentDate, rooms, reservations, onReservationClick, onEmptyClick }: Props) {

    // 1. Calculate Grid
    // Month view usually shows rooms as rows and days of month as cols.
    // However, typical hotel PMS month view is: Rooms (Rows) x Days (Cols)

    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    return (

        <div className="flex flex-col w-full h-full bg-white">
            {/* Scroll Container */}
            <div className="relative h-full overflow-auto custom-scrollbar">

                {/* Content Wrapper */}
                <div className="min-w-fit flex flex-col pb-4">

                    {/* Header Row: Days (Sticky Top) */}
                    <div className="flex border-b h-[60px] sticky top-0 z-40 bg-white shadow-sm">
                        {/* Corner: Habitaciones (Sticky Left + Top) */}
                        <div className="
                            sticky left-0 top-0 z-50 
                            min-w-[140px] w-[140px] md:min-w-[200px] md:w-[200px] 
                            bg-white dark:bg-slate-900 
                            border-r border-gray-200
                            flex items-center justify-center 
                            text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200
                            shadow-[4px_4px_10px_rgba(0,0,0,0.1)]
                        ">
                            Habitaciones
                        </div>

                        {/* Day Columns */}
                        <div className="flex flex-1">
                            {daysInMonth.map(day => (
                                <div key={day.toISOString()} className="flex-1 min-w-[40px] border-r border-gray-100 text-center py-2 flex flex-col justify-center bg-white">
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold">{format(day, "EEE", { locale: es })}</span>
                                    <span className="text-sm font-bold text-gray-700">{format(day, "d")}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Body: Rooms */}
                    <div className="flex flex-col min-w-max">
                        {rooms.map(room => (
                            <div key={room.id} className="flex border-b min-h-[70px] relative group hover:bg-gray-50 transition-colors">

                                {/* Room Label (Sticky Left) */}
                                <div className="
                                    sticky left-0 z-30 
                                    min-w-[140px] w-[140px] md:min-w-[200px] md:w-[200px] 
                                    bg-white dark:bg-slate-900 
                                    border-r border-gray-200
                                    p-2 md:p-3 flex flex-col justify-center 
                                    shadow-[2px_0_10px_rgba(0,0,0,0.05)]
                                ">
                                    <div className="font-bold text-xs md:text-sm text-gray-800 dark:text-gray-100 leading-tight">
                                        {room.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                            {room.type}
                                        </span>
                                    </div>
                                </div>

                                {/* Grid Cells */}
                                <div className="flex flex-1 relative z-0">
                                    {/* Background Cells (Clickable) */}
                                    {daysInMonth.map(day => (
                                        <div
                                            key={day.toISOString()}
                                            className="flex-1 min-w-[40px] border-r border-gray-100 h-full relative hover:bg-black/5 cursor-pointer"
                                            onClick={() => onEmptyClick(day, room.id)}
                                            title={`Crear reserva en ${room.name} el ${format(day, "dd/MM")}`}
                                        />
                                    ))}

                                    {/* Reservations Overlay */}
                                    {reservations
                                        .filter(r => r.room_id === room.id)
                                        .map(res => {
                                            // Calculate position
                                            const checkIn = parseISO(res.check_in);
                                            const checkOut = parseISO(res.check_out);
                                            const viewStart = startOfDay(daysInMonth[0]);
                                            const viewEnd = endOfDay(daysInMonth[daysInMonth.length - 1]);

                                            if (checkOut <= viewStart || checkIn > viewEnd) return null;

                                            const effectiveStart = checkIn < viewStart ? viewStart : checkIn;
                                            const effectiveEnd = checkOut > viewEnd ? viewEnd : checkOut;

                                            const totalDays = daysInMonth.length;
                                            const unitWidth = 100 / totalDays;

                                            const startOffset = Math.ceil((effectiveStart.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
                                            const duration = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));

                                            const left = startOffset * unitWidth;
                                            const width = duration * unitWidth;

                                            return (
                                                <div
                                                    key={res.id}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${left}%`,
                                                        width: `${width}%`,
                                                        top: '4px',
                                                        bottom: '4px',
                                                        zIndex: 10,
                                                        paddingLeft: '1px',
                                                        paddingRight: '1px'
                                                    }}
                                                >
                                                    <ReservationBlock
                                                        reservation={res}
                                                        onClick={() => onReservationClick(res)}
                                                        viewMode="month"
                                                    />
                                                </div>
                                            )
                                        })
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
