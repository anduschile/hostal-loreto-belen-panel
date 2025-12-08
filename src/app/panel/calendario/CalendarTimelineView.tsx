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
        <div className="flex-1 overflow-auto relative custom-scrollbar bg-white">
            <div className="min-w-fit flex flex-col">
                {/* HEADER: días (sticky arriba) */}
                <div className="flex border-b sticky top-0 bg-white z-40 min-w-max">
                    <div className="min-w-[200px] w-[200px] p-2 bg-gray-50 border-r text-center font-bold text-gray-500 text-xs uppercase flex items-center justify-center sticky left-0 z-50 h-[60px]">
                        Habitaciones
                    </div>
                    <div className="flex flex-1">
                        {days.map((day) => (
                            <div
                                key={day.toISOString()}
                                className="flex-1 min-w-[80px] border-r text-center py-2 flex flex-col justify-center"
                            >
                                <span className="text-[10px] text-gray-400 uppercase">
                                    {format(day, "EEE", { locale: es })}
                                </span>
                                <span className="text-sm font-bold text-gray-700">
                                    {format(day, "d MMM", { locale: es })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BODY: habitaciones (todas) */}
                <div className="flex flex-col min-w-max">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="flex border-b min-h-[60px] relative group hover:bg-gray-50"
                        >
                            {/* Columna izquierda: datos habitación */}
                            <div className="min-w-[200px] w-[200px] p-3 border-r bg-white sticky left-0 z-30 flex flex-col justify-center shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                                <div className="font-bold text-sm text-gray-800">
                                    {room.name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {room.type}
                                    </span>
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-300 text-[9px]">
                                            {room.capacity ?? "-"}
                                        </span>
                                        pax
                                    </span>
                                </div>
                            </div>

                            {/* Grid de días + reservas */}
                            <div className="flex flex-1 relative">
                                {/* Celdas de fondo (click para nueva reserva) */}
                                {days.map((day) => (
                                    <div
                                        key={day.toISOString()}
                                        className="flex-1 min-w-[80px] border-r h-full relative hover:bg-black/5"
                                        onClick={() => onEmptyClick(room, day)}
                                        title={`Crear reserva en ${room.name} el ${format(
                                            day,
                                            "dd/MM"
                                        )}`}
                                    />
                                ))}

                                {/* Reservas superpuestas */}
                                {reservations
                                    .filter((r) => r.room_id === room.id)
                                    .map((res) => {
                                        const checkIn = parseISO(res.check_in);
                                        const checkOut = parseISO(res.check_out);

                                        // Fuera del rango de la vista
                                        if (checkOut <= viewStart || checkIn > viewEnd) return null;

                                        const effectiveStart =
                                            checkIn < viewStart ? viewStart : checkIn;
                                        const effectiveEnd =
                                            checkOut > viewEnd ? viewEnd : checkOut;

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
                                                    top: "4px",
                                                    bottom: "4px",
                                                    zIndex: 5,
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
