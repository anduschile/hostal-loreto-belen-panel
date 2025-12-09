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
        <div className="flex-1 w-full h-full overflow-hidden flex flex-col bg-white">
            {/* Contenedor principal scrollable */}
            <div className="flex-1 overflow-auto relative custom-scrollbar">

                {/* 
                    CONTENEDOR DEL CALENDARIO (min-w-fit para asegurar scroll horizontal) 
                    relative para posicionar elementos absolutos dentro
                */}
                <div className="min-w-[1000px] flex flex-col pb-4">

                    {/* 
                        HEADER: DÍAS (Sticky Top)
                        z-40 para estar sobre el contenido.
                    */}
                    <div className="flex border-b h-[60px] sticky top-0 z-40 bg-white shadow-sm">

                        {/* 
                            ESQUINA SUPERIOR IZQUIERDA (Sticky Left + Top)
                            Debe estar por encima de todo (z-50) para no ocultarse al scrollear hacia la derecha o abajo.
                        */}
                        <div className="
                            sticky left-0 top-0 z-50 
                            min-w-[140px] w-[140px] md:min-w-[200px] md:w-[200px] 
                            bg-slate-900 text-white
                            border-r border-slate-700
                            flex items-center justify-center 
                            text-xs font-bold uppercase tracking-wider
                            shadow-[4px_4px_10px_rgba(0,0,0,0.1)]
                        ">
                            Habitaciones
                        </div>

                        {/* 
                            FILA DE FECHAS
                            Se mueve horizontalmente, pero fija verticalmente gracias al sticky del contenedor padre.
                        */}
                        <div className="flex flex-1 bg-white">
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

                    {/* BODY: HABITACIONES */}
                    <div className="flex flex-col">
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="flex border-b min-h-[70px] relative group hover:bg-gray-50 transition-colors"
                            >
                                {/* 
                                    COLUMNA IZQUIERDA: DATOS HABITACIÓN (Sticky Left)
                                    z-30 para estar sobre el contenido (reservas), pero bajo el header (z-40/50).
                                    bg-white/95 backdrop-blur para efecto moderno.
                                */}
                                <div className="
                                    sticky left-0 z-30 
                                    min-w-[140px] w-[140px] md:min-w-[200px] md:w-[200px] 
                                    bg-slate-50 border-r border-gray-200 
                                    p-3 flex flex-col justify-center 
                                    shadow-[2px_0_10px_rgba(0,0,0,0.05)]
                                ">
                                    <div className="font-bold text-sm text-gray-800 leading-tight">
                                        {room.name}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                        <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                            {room.type}
                                        </span>
                                        <span className="text-[10px] text-gray-500 flex items-center gap-1" title="Capacidad">
                                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 border border-gray-200 text-[9px] font-medium">
                                                {room.capacity ?? "-"}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {/* GRID DE RESERVAS */}
                                <div className="flex flex-1 relative z-0">
                                    {/* Celdas de fondo (click para nueva reserva) */}
                                    {days.map((day) => (
                                        <div
                                            key={day.toISOString()}
                                            className="flex-1 min-w-[80px] border-r border-gray-100 h-full relative cursor-pointer hover:bg-blue-50/50 transition-colors"
                                            onClick={() => onEmptyClick(room, day)}
                                            title={`Crear reserva en ${room.name} el ${format(
                                                day,
                                                "dd/MM"
                                            )}`}
                                        />
                                    ))}

                                    {/* BLOQUES DE RESERVA (Absolute) */}
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
        </div>
    );
}
