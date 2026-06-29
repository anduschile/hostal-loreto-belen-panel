"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { HostalMenu, MealService, Company } from "@/types/hostal";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  mealService?: MealService | null;
  isLoading?: boolean;
}

export default function MealServiceModal({
  open,
  onClose,
  onSave,
  mealService,
  isLoading = false,
}: Props) {
  const [menus, setMenus] = useState<HostalMenu[]>([]);
  const [fecha, setFecha] = useState(mealService?.fecha || "");
  const [tipoServicio, setTipoServicio] = useState<"almuerzo" | "cena">(
    mealService?.tipo_servicio || "almuerzo"
  );
  const [menuAId, setMenuAId] = useState(mealService?.menu_a_id || "");
  const [menuBId, setMenuBId] = useState(mealService?.menu_b_id || "");
  const [tipoPrecio, setTipoPrecio] = useState<"preferencial" | "normal">(
    mealService?.tipo_precio || "preferencial"
  );
  const [notas, setNotas] = useState(mealService?.notas || "");
  const [error, setError] = useState("");
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [multiexportPrices, setMultiexportPrices] = useState<{ preferencial: number; normal: number } | null>(null);

  useEffect(() => {
    if (open) {
      fetchMenus();
      fetchMultiexportPrices();
    }
  }, [open]);

  const fetchMenus = async () => {
    try {
      setLoadingMenus(true);
      const res = await fetch("/api/menus");
      if (!res.ok) throw new Error("Failed to fetch menus");
      const { data } = await res.json();
      setMenus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMenus(false);
    }
  };

  const fetchMultiexportPrices = async () => {
    try {
      const res = await fetch("/api/companies");
      if (!res.ok) return;
      const data = await res.json();
      const companies = Array.isArray(data) ? data : data.data || [];
      const multiexport = companies.find((c: Company) => c.name.toLowerCase().includes("multiexport"));
      if (multiexport) {
        setMultiexportPrices({
          preferencial: multiexport.precio_preferencial || 0,
          normal: multiexport.precio_normal || 0,
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch multiexport prices:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fecha) {
      setError("La fecha es obligatoria");
      return;
    }

    if (!menuAId || !menuBId) {
      setError("Debe seleccionar ambos menús");
      return;
    }

    if (menuAId === menuBId) {
      setError("El menú A y el menú B deben ser diferentes");
      return;
    }

    try {
      await onSave({
        fecha,
        tipo_servicio: tipoServicio,
        menu_a_id: parseInt(menuAId as string),
        menu_b_id: parseInt(menuBId as string),
        tipo_precio: tipoPrecio,
        notas: notas.trim() || null,
      });

      // Reset form
      setFecha("");
      setTipoServicio("almuerzo");
      setMenuAId("");
      setMenuBId("");
      setTipoPrecio("preferencial");
      setNotas("");
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">
          {mealService?.id ? "Editar Servicio" : "Nuevo Servicio de Comida"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo de Servicio *
            </label>
            <select
              value={tipoServicio}
              onChange={(e) =>
                setTipoServicio(e.target.value as "almuerzo" | "cena")
              }
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="almuerzo">Almuerzo</option>
              <option value="cena">Cena</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo de Precio *
            </label>
            <select
              value={tipoPrecio}
              onChange={(e) =>
                setTipoPrecio(e.target.value as "preferencial" | "normal")
              }
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="preferencial">Preferencial</option>
              <option value="normal">Normal</option>
            </select>
            {multiexportPrices && (
              <p className="text-xs text-gray-500 mt-1">
                Multiexport - Preferencial: ${multiexportPrices.preferencial.toLocaleString('es-CL')} | Normal: ${multiexportPrices.normal.toLocaleString('es-CL')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Menú A *</label>
            {loadingMenus ? (
              <p className="text-sm text-gray-500">Cargando menús...</p>
            ) : (
              <select
                value={menuAId}
                onChange={(e) => setMenuAId(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Selecciona un menú</option>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Menú B *</label>
            {loadingMenus ? (
              <p className="text-sm text-gray-500">Cargando menús...</p>
            ) : (
              <select
                value={menuBId}
                onChange={(e) => setMenuBId(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Selecciona un menú</option>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Notas adicionales"
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || loadingMenus}
              className="px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {isLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
