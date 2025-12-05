"use client";

import React, { useState } from "react";

interface Room {
  id: number;
  name: string;
}

interface Reservation {
  id: number;
  roomId: number;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  status: string;
  guest?: string;
  notes?: string;
}

interface Props {
  month: number;
  year: number;
  rooms: Room[];
  reservations: Reservation[];
  onSelectRange?: (payload: { roomId: number; start: string; end: string }) => void;
  onClickReservation?: (reservation: Reservation) => void;
}

function parseDate(str: string) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function CalendarGrid({
  month,
  year,
  rooms,
  reservations,
  onSelectRange,
  onClickReservation,
}: Props) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const [dragging, setDragging] = useState(false);
  const [selection, setSelection] = useState<{
    roomId: number;
    startDay: number;
    endDay: number;
  } | null>(null);

  const startDrag = (roomId: number, day: number) => {
    setDragging(true);
    setSelection({ roomId, startDay: day, endDay: day });
  };

  const updateDrag = (roomId: number, day: number) => {
    if (!dragging || !selection) return;
    if (roomId !== selection.roomId) return;
    setSelection((prev) =>
      prev ? { ...prev, endDay: day } : null
    );
  };

  const endDrag = () => {
    if (!dragging || !selection) {
      setDragging(false);
      setSelection(null);
      return;
    }

    const { roomId, startDay, endDay } = selection;
    const from = Math.min(startDay, endDay);
    const to = Math.max(startDay, endDay);

    if (onSelectRange && from <= to) {
      const startDate = new Date(year, month - 1, from).toISOString().slice(0, 10);
      const endDate = new Date(year, month - 1, to).toISOString().slice(0, 10);

      onSelectRange({ roomId, start: startDate, end: endDate });
    }

    setDragging(false);
    setSelection(null);
  };

  return (
    <div
      className="bg-white p-4 rounded shadow w-full overflow-auto"
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <table className="border-collapse w-full min-w-[900px]">
        <thead>
          <tr>
            <th className="border p-2 bg-gray-100 text-left w-40">Habitación</th>
            {days.map((day) => (
              <th key={day} className="border p-1 text-center bg-gray-50">
                {day}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="h-10">
              <td className="border p-2 font-medium bg-gray-50 whitespace-nowrap">
                {room.name}
              </td>

              {days.map((day) => {
                const cellDate = new Date(year, month - 1, day);

                const res = reservations.find((r) => {
                  if (r.roomId !== room.id) return false;
                  const start = parseDate(r.start);
                  const end = parseDate(r.end);
                  return cellDate >= start && cellDate <= end;
                });

                const isSelected =
                  selection &&
                  selection.roomId === room.id &&
                  day >= Math.min(selection.startDay, selection.endDay) &&
                  day <= Math.max(selection.startDay, selection.endDay);

                let content: React.ReactNode = null;

                if (res) {
                  const color =
                    res.status === "confirmed"
                      ? "bg-green-500"
                      : res.status === "checkin"
                      ? "bg-blue-500"
                      : res.status === "checkout"
                      ? "bg-gray-500"
                      : res.status === "cancelled"
                      ? "bg-red-500"
                      : "bg-gray-400";

                  content = (
                    <div
                      className={`${color} h-full w-full text-[10px] text-white flex items-center justify-center cursor-pointer`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickReservation && onClickReservation(res);
                      }}
                    >
                      {res.id}
                    </div>
                  );
                } else if (isSelected) {
                  content = <div className="bg-yellow-300 h-full w-full">Nuevo</div>;
                }

                return (
                  <td
                    key={day}
                    className="border p-0 h-8 cursor-pointer"
                    onMouseDown={() => startDrag(room.id, day)}
                    onMouseEnter={() => updateDrag(room.id, day)}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
