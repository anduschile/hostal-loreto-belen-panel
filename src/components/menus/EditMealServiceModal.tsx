"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { MealService, HostalMenu } from "@/types/hostal";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  service: MealService;
  menus: HostalMenu[];
  onUpdated: (updated: MealService) => void;
}

export default function EditMealServiceModal({
  open,
  onClose,
  service,
  menus,
  onUpdated,
}: Props) {
  const [menuAId, setMenuAId] = useState(service.menu_a_id);
  const [menuBId, setMenuBId] = useState(service.menu_b_id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!menuAId || !menuBId) {
      setError("Debes seleccionar ambos menús");
      return;
    }

    if (menuAId === menuBId) {
      setError("Los menús A y B no pueden ser iguales");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/meal-services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: service.fecha,
          tipo_servicio: service.tipo_servicio,
          menu_a_id: menuAId,
          menu_b_id: menuBId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar el servicio");
      }

      const { data: updated } = await res.json();
      onUpdated(updated);
      toast.success("Menús actualizados correctamente");
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const menuAName = menus.find((m) => m.id === menuAId)?.nombre || "";
  const menuBName = menus.find((m) => m.id === menuBId)?.nombre || "";

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Editar Menús del Servicio</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Menú A
            </label>
            <select
              value={menuAId}
              onChange={(e) => setMenuAId(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un menú...</option>
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.nombre}
                </option>
              ))}
            </select>
            {menuAName && (
              <p className="text-xs text-gray-600 mt-1">{menuAName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Menú B
            </label>
            <select
              value={menuBId}
              onChange={(e) => setMenuBId(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un menú...</option>
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.nombre}
                </option>
              ))}
            </select>
            {menuBName && (
              <p className="text-xs text-gray-600 mt-1">{menuBName}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
