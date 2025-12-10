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

    // Cálculo de estilos para posicionamiento absoluto de reservas
    // Mantenemos la lógica de porcentajes, asegurándonos de que el contenedor de filas tenga el ancho correcto (min-w-max).

    return (
        <div className="relative h-full overflow-y-auto custom-scrollbar bg-white">
            <div className="flex w-full">

                {/* === IZQUIERDA: COLUMNA FIJA (Sticky Left) === */}
                {/* 
                    Al estar fuera del contenedor overflow-x, esta columna naturalmente se queda a la izquierda.
                    Usamos 'sticky left-0' por seguridad si el layout padre cambia, pero principalmente es estática en X.
                    Scrollea verticalmente junto con el Grid Derecho gracias al padre flex.
                */}
                <div className="sticky left-0 z-50 bg-white border-r border-gray-200 shadow-[4px_0_10px_rgba(0,0,0,0.05)] flex-none w-[140px] md:w-[200px]">

                    {/* Corner Header (Sticky Top) */}
                    <div className="sticky top-0 z-50 h-[60px] bg-white border-b border-gray-200 flex items-center justify-center font-bold text-xs uppercase tracking-wider text-gray-700">
                        Habitaciones
                    </div>

                    {/* Room Names Rows */}
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="h-[70px] border-b border-gray-200 p-2 md:p-3 flex flex-col justify-center bg-white group hover:bg-gray-50 transition-colors"
                        >
                            <div className="font-bold text-xs md:text-sm text-gray-800 leading-tight truncate">
                                {room.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 truncate max-w-full">
                                    {room.type}
                                </span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 border border-gray-200 text-[9px] font-medium">
                                        {room.capacity ?? "-"}
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* === DERECHA: GRID SCROLLEABLE (Overflow X) === */}
                <div className="flex-1 min-w-0 overflow-x-auto">
                    <div className="min-w-max">

                        {/* Date Header Row (Sticky Top) */}
                        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 h-[60px] flex">
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

                        {/* Rooms Grid Rows */}
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="h-[70px] border-b border-gray-100 flex relative group hover:bg-gray-50 transition-colors"
                            >
                                {/* Celdas de Días */}
                                {days.map((day) => (
                                    <div
                                        key={day.toISOString()}
                                        className="flex-1 min-w-[80px] border-r border-gray-100 h-full relative cursor-pointer hover:bg-blue-50/50 transition-colors"
                                        onClick={() => onEmptyClick(room, day)}
                                    />
                                ))}

                                {/* Bloques de Reservas (Absolute) */}
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
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
