"use client";

import { useMemo, useState } from "react";
import type { Reservation } from "@/lib/data/reservations";

type Props = {
  reservations: Reservation[];
  initialYear: number;
  initialMonth: number; // 1-12
};

type MonthState = {
  year: number;
  month: number; // 1-12
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatMonthYear({ year, month }: MonthState): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
  });
}

// Devuelve true si el día (date) está dentro de la reserva (check_in inclusive, check_out exclusive)
function isDateWithinReservation(date: Date, checkIn: Date, checkOut: Date) {
  return checkIn <= date && date < checkOut;
}

export default function CalendarClient({
  reservations,
  initialYear,
  initialMonth,
}: Props) {
  const [monthState, setMonthState] = useState<MonthState>({
    year: initialYear,
    month: initialMonth,
  });

  const daysInMonth = useMemo(
    () => getDaysInMonth(monthState.year, monthState.month),
    [monthState]
  );

  // Queremos un set de room_ids que aparezcan en el calendario
  const roomIds = useMemo(() => {
    const ids = Array.from(
      new Set(reservations.map((r) => r.room_id))
    ).sort((a, b) => a - b);
    return ids;
  }, [reservations]);

  // Precomputar un mapa room_id -> mapa de dia -> reservas
  const occupancyMap = useMemo(() => {
    const map = new Map<
      number,
      Map<number, Reservation[]>
    >();

    // Inicializamos mapa
    for (const roomId of roomIds) {
      map.set(roomId, new Map());
      for (let day = 1; day <= daysInMonth; day++) {
        map.get(roomId)!.set(day, []);
      }
    }

    // Fecha base del mes
    for (const r of reservations) {
      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);

      // Si la reserva no toca el mes actual, la ignoramos
      // Chequeo rápido: [checkIn, checkOut) se solapa con el mes
      const monthStart = new Date(monthState.year, monthState.month - 1, 1);
      const monthEnd = new Date(monthState.year, monthState.month, 1); // primer día del mes siguiente

      const overlapsMonth =
        checkIn < monthEnd && checkOut > monthStart;

      if (!overlapsMonth) continue;

      const roomId = r.room_id;
      if (!map.has(roomId)) {
        // Por si hay reservas para una pieza que no estaba en roomIds (raro pero posible)
        map.set(roomId, new Map());
        for (let day = 1; day <= daysInMonth; day++) {
          map.get(roomId)!.set(day, []);
        }
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(
          monthState.year,
          monthState.month - 1,
          day
        );

        if (isDateWithinReservation(currentDate, checkIn, checkOut)) {
          const dayMap = map.get(roomId)!;
          const list = dayMap.get(day)!;
          list.push(r);
        }
      }
    }

    return map;
  }, [reservations, roomIds, daysInMonth, monthState]);

  const goToPrevMonth = () => {
    setMonthState((prev) => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setMonthState((prev) => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  return (
    <div className="space-y-4">
      {/* Controles de mes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
          >
            ← Mes anterior
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
          >
            Mes siguiente →
          </button>
        </div>
        <div className="text-sm font-medium text-gray-700">
          {formatMonthYear(monthState)}
        </div>
      </div>

      {/* Leyenda simple */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-blue-500" />
          <span>Día con al menos una reserva</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold">●</span>
          <span>Muestra la inicial del estado (H: hold, C: confirmada, etc.)</span>
        </div>
      </div>

      {/* Tabla / grid */}
      <div className="overflow-auto border rounded-lg bg-white">
        <table className="min-w-max border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 sticky top-0 z-10">
              <th className="border px-2 py-1 text-left min-w-[70px]">
                Habitación
              </th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (day) => (
                  <th
                    key={day}
                    className="border px-1 py-1 text-center min-w-[32px]"
                  >
                    {day}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {roomIds.length === 0 && (
              <tr>
                <td
                  className="border px-2 py-3 text-center text-gray-400"
                  colSpan={daysInMonth + 1}
                >
                  No hay reservas aún para mostrar en el calendario.
                </td>
              </tr>
            )}

            {roomIds.map((roomId) => {
              const roomMap = occupancyMap.get(roomId)!;

              return (
                <tr key={roomId} className="hover:bg-gray-50">
                  <td className="border px-2 py-1 font-medium min-w-[70px]">
                    Hab. {roomId}
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                    (day) => {
                      const reservasDelDia = roomMap.get(day) ?? [];
                      const hasReservation = reservasDelDia.length > 0;

                      return (
                        <td
                          key={day}
                          className={`border px-1 py-1 align-top ${
                            hasReservation ? "bg-blue-50" : ""
                          }`}
                        >
                          {hasReservation && (
                            <div className="flex flex-col gap-0.5">
                              {reservasDelDia.slice(0, 3).map((r) => {
                                const statusInitial =
                                  r.status === "hold"
                                    ? "H"
                                    : r.status === "confirmada"
                                    ? "C"
                                    : r.status === "checkin"
                                    ? "I"
                                    : r.status === "checkout"
                                    ? "O"
                                    : "X";

                                return (
                                  <div
                                    key={r.id}
                                    className="flex items-center gap-1 rounded bg-blue-500 px-1 py-0.5 text-[10px] text-white"
                                  >
                                    <span className="font-semibold">
                                      {statusInitial}
                                    </span>
                                    <span className="truncate max-w-[70px]">
                                      {r.guest_name || r.code}
                                    </span>
                                  </div>
                                );
                              })}
                              {reservasDelDia.length > 3 && (
                                <span className="text-[9px] text-gray-600">
                                  +{reservasDelDia.length - 3} más
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    }
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
