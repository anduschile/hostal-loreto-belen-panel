"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { buildWhatsappMessage } from "@/lib/utils/whatsapp";
import { MealConsumption, HostalMenu } from "@/types/hostal";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  consumption: MealConsumption & {
    guest_full_name?: string;
    guest_phone?: string;
  };
  menuAName: string;
  menuBName: string;
  fecha: string;
  tipoServicio: string;
  onSent: () => void;
}

export default function WhatsappPreviewModal({
  open,
  onClose,
  consumption,
  menuAName,
  menuBName,
  fecha,
  tipoServicio,
  onSent,
}: Props) {
  const [menuA, setMenuA] = useState<HostalMenu | null>(null);
  const [menuB, setMenuB] = useState<HostalMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && consumption) {
      fetchMenus();
    }
  }, [open, consumption]);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      setError("");
      // We need menu IDs from the meal service, but we don't have them here
      // This is a limitation of the current component structure
      // For now, we'll just use the menu names
      setMenuA(null);
      setMenuB(null);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSendWhatsapp = async () => {
    try {
      if (!consumption.guest_phone) {
        setError("El huésped no tiene teléfono registrado");
        return;
      }

      const message = buildWhatsappMessage({
        guestName: consumption.guest_full_name || "Huésped",
        fecha,
        tipoServicio,
        menuANombre: menuAName,
        menuADescripcion: menuA?.descripcion || null,
        menuAFotoUrl: menuA?.foto_url || null,
        menuBNombre: menuBName,
        menuBDescripcion: menuB?.descripcion || null,
        menuBFotoUrl: menuB?.foto_url || null,
        phoneNumber: consumption.guest_phone,
      });

      // Update status
      await fetch(`/api/meal-consumption/${consumption.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado_whatsapp: "enviado",
          whatsapp_enviado_at: new Date().toISOString(),
        }),
      });

      // Open WhatsApp
      window.open(message.linkWaMe, "_blank");

      onSent();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Vista Previa WhatsApp</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
          <div className="text-xs text-green-800 whitespace-pre-wrap font-mono">
            Hola {consumption.guest_full_name},
            <br />
            <br />
            Te saluda Hostal Loreto Belén. Te esperamos el {fecha} para tu{" "}
            {tipoServicio}.
            <br />
            <br />
            Tenemos dos alternativas:
            <br />
            <br />
            <strong>Opción A:</strong> {menuAName}
            <br />
            {menuA?.descripcion && `${menuA.descripcion}\n`}
            {menuA?.foto_url && `[Foto: ${menuA.foto_url}]\n`}
            <br />
            <strong>Opción B:</strong> {menuBName}
            <br />
            {menuB?.descripcion && `${menuB.descripcion}\n`}
            {menuB?.foto_url && `[Foto: ${menuB.foto_url}]\n`}
            <br />
            Respóndenos con <strong>A</strong> o <strong>B</strong> para tener tu
            plato listo cuando llegues.
            <br />
            <br />
            Saludos
          </div>
        </div>

        <div className="bg-gray-100 p-3 rounded text-sm mb-4">
          <p className="text-xs text-gray-600">Teléfono:</p>
          <p className="font-semibold">
            {consumption.guest_phone || "Sin teléfono registrado"}
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSendWhatsapp}
            disabled={loading || !consumption.guest_phone}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <span>📱 Enviar WhatsApp</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
