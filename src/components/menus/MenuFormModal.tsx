"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { HostalMenu } from "@/types/hostal";
import { uploadMenuPhoto } from "@/lib/supabase/storage";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  menu?: HostalMenu | null;
  isLoading?: boolean;
}

export default function MenuFormModal({
  open,
  onClose,
  onSave,
  menu,
  isLoading = false,
}: Props) {
  const [nombre, setNombre] = useState(menu?.nombre || "");
  const [descripcion, setDescripcion] = useState(menu?.descripcion || "");
  const [ingredientes, setIngredientes] = useState(menu?.ingredientes || "");
  const [fotoUrl, setFotoUrl] = useState(menu?.foto_url || "");
  const [isActive, setIsActive] = useState(menu?.is_active !== false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError("");
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/menus/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { data } = await res.json();
      setFotoUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    try {
      await onSave({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        ingredientes: ingredientes.trim() || null,
        foto_url: fotoUrl || null,
        is_active: isActive,
      });

      // Reset form
      setNombre("");
      setDescripcion("");
      setIngredientes("");
      setFotoUrl("");
      setIsActive(true);
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
          {menu ? "Editar Menú" : "Nuevo Menú"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Ej: Pasta a la Carbonara"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Descripción breve del plato"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ingredientes</label>
            <textarea
              value={ingredientes}
              onChange={(e) => setIngredientes(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Lista de ingredientes"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Foto</label>
            {fotoUrl && (
              <div className="mb-2">
                <img
                  src={fotoUrl}
                  alt={nombre}
                  className="w-20 h-20 object-cover rounded"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="w-full text-sm"
            />
            {uploading && <p className="text-xs text-blue-600 mt-1">Subiendo...</p>}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm">
              Activo
            </label>
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
              disabled={isLoading || uploading}
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
