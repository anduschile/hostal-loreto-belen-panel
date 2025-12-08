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
        <div className="flex-1 overflow-auto relative custom-scrollbar bg-white">
            <div className="min-w-fit flex flex-col">
                {/* Header Row: Days (Sticky Top) */}
                <div className="flex border-b sticky top-0 bg-white z-40 min-w-max">
                    <div className="min-w-[200px] w-[200px] p-2 bg-gray-50 border-r text-center font-bold text-gray-500 text-xs uppercase flex items-center justify-center sticky left-0 z-50 h-[60px]">
                        Habitaciones
                    </div>
                    <div className="flex flex-1">
                        {daysInMonth.map(day => (
                            <div key={day.toISOString()} className="flex-1 min-w-[40px] border-r text-center py-2 flex flex-col justify-center">
                                <span className="text-[10px] text-gray-400 uppercase">{format(day, "EEE", { locale: es })}</span>
                                <span className="text-sm font-bold text-gray-700">{format(day, "d")}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body: Rooms */}
                <div className="flex flex-col min-w-max">
                    {rooms.map(room => (
                        <div key={room.id} className="flex border-b min-h-[60px] relative group hover:bg-gray-50">
                            {/* Room Label (Sticky Left) */}
                            <div className="min-w-[200px] w-[200px] p-3 border-r bg-white sticky left-0 z-30 flex flex-col justify-center shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                                <div className="font-bold text-sm text-gray-800">{room.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {room.type}
                                    </span>
                                </div>
                            </div>

                            {/* Grid Cells */}
                            <div className="flex flex-1 relative">
                                {/* Background Cells (Clickable) */}
                                {daysInMonth.map(day => (
                                    <div
                                        key={day.toISOString()}
                                        className="flex-1 min-w-[40px] border-r h-full relative hover:bg-black/5"
                                        onClick={() => onEmptyClick(day, room.id)}
                                        title={`Crear reserva en ${room.name} el ${format(day, "dd/MM")}`}
                                    >
                                    </div>
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
                                                    zIndex: 5
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
    );
}
