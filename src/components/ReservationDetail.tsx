"use client";

import { useState } from "react";

export default function ReservationDetail({
  reservation,
  roomName,
  onSave,
  onDelete,
  onClose,
}: {
  reservation: any;
  roomName: string;
  onSave: (data: any) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [guest, setGuest] = useState(reservation.guest || "");
  const [notes, setNotes] = useState(reservation.notes || "");
  const [status, setStatus] = useState(reservation.status || "confirmed");

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl p-6 z-50 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Reserva #{reservation.id}</h2>
        <button onClick={onClose}>✖</button>
      </div>

      <p className="text-sm text-gray-500">Habitación</p>
      <p className="font-semibold">{roomName}</p>

      <p className="text-sm text-gray-500">Fechas</p>
      <p>{reservation.start} → {reservation.end}</p>

      <label className="flex flex-col gap-1">
        <span>Huésped</span>
        <input
          className="border p-2 rounded"
          value={guest}
          onChange={(e) => setGuest(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>Estado</span>
        <select
          className="border p-2 rounded"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="confirmed">Confirmada</option>
          <option value="checkin">Check-in</option>
          <option value="checkout">Check-out</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span>Notas</span>
        <textarea
          className="border p-2 rounded"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="flex justify-between mt-auto pt-6">
        <button onClick={onDelete} className="px-4 py-2 bg-red-600 text-white rounded">
          Eliminar
        </button>

        <button
          onClick={() => onSave({ guest, notes, status })}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
