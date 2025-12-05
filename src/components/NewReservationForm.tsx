"use client";

import { useState } from "react";

export default function NewReservationForm({
  roomName,
  start,
  end,
  onSave,
  onCancel,
}: {
  roomName: string;
  start: string;
  end: string;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [guest, setGuest] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Nueva Reserva</h2>

      <div>
        <p className="text-sm text-gray-500">Habitación</p>
        <p className="font-semibold">{roomName}</p>
      </div>

      <div className="flex gap-4">
        <div>
          <p className="text-sm text-gray-500">Entrada</p>
          <p>{start}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Salida</p>
          <p>{end}</p>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-500">Nombre huésped</span>
        <input
          type="text"
          value={guest}
          onChange={(e) => setGuest(e.target.value)}
          className="border rounded p-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-500">Notas</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border rounded p-2"
        />
      </label>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Cancelar
        </button>

        <button
          onClick={() => onSave({ guest, notes })}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
