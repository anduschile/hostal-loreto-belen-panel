"use client";

import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarData, CalendarReservation } from "@/lib/data/calendar";
import ReservationBlock from "./ReservationBlock";

type ViewMode = "day" | "week";

type Props = {
    data: CalendarData;
    days: Date[];
    viewMode: ViewMode;
    start: Date;
    end: Date;
    onReservationClick: (res: CalendarReservation) => void;
    onEmptyClick: (room: { id: number }, date: Date) => void;
};

export default function CalendarTimelineView({
    data,
    days,
    viewMode,
    start,
    end,
    onReservationClick,
    onEmptyClick,
}: Props) {
    const rooms = data.rooms;
    const reservations = data.reservations;

    const viewStart = startOfDay(start);
    const viewEnd = endOfDay(end);
    const totalDays = days.length;
    const unitWidth = 100 / totalDays;

    return (
        <div className="relative h-full overflow-auto custom-scrollbar bg-white">
            <div className="min-w-fit flex flex-col pb-4">

                {/* HEADER ROW */}
                <div className="sticky top-0 z-40 flex border-b bg-white h-[60px] shadow-sm">
                    {/* ESQUINA SUPERIOR IZQUIERDA - FIX OVERLAP */}
                    <div className="sticky left-0 z-50 min-w-[140px] w-[140px] md:min-w-[200px] md:w-[200px] bg-white border-r border-gray-200 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-gray-700 shadow-[4px_0_10px_rgba(0,0,0,0.05)]">
                        Habitaciones
                    </div>

                    {/* DÍAS */}
                    <div className="flex flex-1">
                        {days.map((day) => (
                            <div
                                key={day.toISOString()}
                                className="flex-1 min-w-[80px] border-r border-gray-100 text-center py-2 flex flex-col justify-center bg-white"
                            >
                                <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">
                                    {format(day, "EEE", { locale: es })}
                                </span>
                                <span className="text-sm font-bold text-gray-800">
                                    {format(day, "d MMM", { locale: es })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HABITACIONES ROWS */}
                <div className="flex flex-col">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="flex border-b min-h-[70px] relative hover:bg-gray-50 transition-colors"
                        >
                            {/* COLUMNA IZQUIERDA STICKY */}
                            <div className="sticky left-0 z-30 min-w-[140px] w-[140px] md:min-w-[200px] md:w-[200px] bg-white border-r border-gray-200 p-2 md:p-3 flex flex-col justify-center shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                                <div className="font-bold text-xs md:text-sm text-gray-800 leading-tight">
                                    {room.name}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                        {room.type}
                                    </span>
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 border border-gray-200 text-[9px] font-medium">
                                            {room.capacity ?? "-"}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* GRID CELDAS */}
                            <div className="flex flex-1 relative z-0">
                                {days.map((day) => (
                                    <div
                                        key={day.toISOString()}
                                        className="flex-1 min-w-[80px] border-r border-gray-100 h-full relative cursor-pointer hover:bg-blue-50/50 transition-colors"
                                        onClick={() => onEmptyClick(room, day)}
                                    />
                                ))}

                                {/* BLOQUES RESERVAS */}
                                {reservations
                                    .filter((r) => r.room_id === room.id)
                                    .map((res) => {
                                        const checkIn = parseISO(res.check_in);
                                        const checkOut = parseISO(res.check_out);

                                        if (checkOut <= viewStart || checkIn > viewEnd) return null;

                                        const effectiveStart = checkIn < viewStart ? viewStart : checkIn;
                                        const effectiveEnd = checkOut > viewEnd ? viewEnd : checkOut;

                                        const startOffset = Math.ceil(
                                            (effectiveStart.getTime() - viewStart.getTime()) /
                                            (1000 * 60 * 60 * 24)
                                        );
                                        const duration = Math.ceil(
                                            (effectiveEnd.getTime() - effectiveStart.getTime()) /
                                            (1000 * 60 * 60 * 24)
                                        );

                                        const left = startOffset * unitWidth;
                                        const width = duration * unitWidth;

                                        return (
                                            <div
                                                key={res.id}
                                                style={{
                                                    position: "absolute",
                                                    left: `${left}%`,
                                                    width: `${width}%`,
                                                    top: "6px",
                                                    bottom: "6px",
                                                    zIndex: 10,
                                                    paddingLeft: "2px",
                                                    paddingRight: "2px"
                                                }}
                                            >
                                                <ReservationBlock
                                                    reservation={res}
                                                    onClick={() => onReservationClick(res)}
                                                    viewMode={viewMode}
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
