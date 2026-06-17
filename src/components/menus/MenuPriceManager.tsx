"use client";

import { useEffect, useState } from "react";
import { MenuPrice, Company } from "@/types/hostal";

interface Props {
  menuId: number;
}

export default function MenuPriceManager({ menuId }: Props) {
  const [prices, setPrices] = useState<MenuPrice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newPrice, setNewPrice] = useState({
    company_id: "",
    tipo_servicio: "almuerzo" as const,
    precio: "",
    vigente_desde: new Date().toISOString().split("T")[0],
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState("");

  useEffect(() => {
    fetchData();
  }, [menuId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pricesRes, companiesRes] = await Promise.all([
        fetch(`/api/menus/${menuId}/prices`),
        fetch("/api/companies"),
      ]);

      if (!pricesRes.ok || !companiesRes.ok) throw new Error("Failed to fetch");

      const { data: pricesData } = await pricesRes.json();
      const companiesData = await companiesRes.json();

      setPrices(pricesData || []);
      setCompanies(companiesData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrice = async () => {
    try {
      setError("");
      if (!newPrice.precio) {
        setError("El precio es obligatorio");
        return;
      }

      const res = await fetch(`/api/menus/${menuId}/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: newPrice.company_id ? parseInt(newPrice.company_id) : null,
          tipo_servicio: newPrice.tipo_servicio,
          precio: parseFloat(newPrice.precio),
          vigente_desde: newPrice.vigente_desde,
        }),
      });

      if (!res.ok) throw new Error("Failed to add price");

      await fetchData();
      setNewPrice({
        company_id: "",
        tipo_servicio: "almuerzo",
        precio: "",
        vigente_desde: new Date().toISOString().split("T")[0],
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdatePrice = async (priceId: number) => {
    try {
      setError("");
      if (!editingPrice) {
        setError("El precio es obligatorio");
        return;
      }

      const res = await fetch(`/api/menus/${menuId}/prices`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          precio: parseFloat(editingPrice),
        }),
      });

      if (!res.ok) throw new Error("Failed to update price");

      await fetchData();
      setEditingId(null);
      setEditingPrice("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePrice = async (priceId: number) => {
    try {
      const res = await fetch(`/api/menus/${menuId}/prices?priceId=${priceId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete price");

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Agregar Nuevo Precio</h3>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={newPrice.company_id}
            onChange={(e) =>
              setNewPrice({ ...newPrice, company_id: e.target.value })
            }
            className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">Público (sin empresa)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={newPrice.tipo_servicio}
            onChange={(e) =>
              setNewPrice({
                ...newPrice,
                tipo_servicio: e.target.value as "almuerzo" | "cena",
              })
            }
            className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="almuerzo">Almuerzo</option>
            <option value="cena">Cena</option>
          </select>

          <input
            type="number"
            step="0.01"
            min="0"
            value={newPrice.precio}
            onChange={(e) =>
              setNewPrice({ ...newPrice, precio: e.target.value })
            }
            placeholder="Precio"
            className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <input
            type="date"
            value={newPrice.vigente_desde}
            onChange={(e) =>
              setNewPrice({ ...newPrice, vigente_desde: e.target.value })
            }
            className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <button
          onClick={handleAddPrice}
          className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
        >
          Agregar
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2">Precios Configurados</h3>
        {prices.length === 0 ? (
          <p className="text-xs text-gray-500">Sin precios configurados</p>
        ) : (
          <div className="space-y-2">
            {prices.map((price) => (
              <div
                key={price.id}
                className="flex items-center gap-2 p-2 border rounded text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {companies.find((c) => c.id === price.company_id)?.name ||
                      "Público"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {price.tipo_servicio} • desde {price.vigente_desde}
                  </div>
                </div>

                {editingId === price.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingPrice}
                      onChange={(e) => setEditingPrice(e.target.value)}
                      className="w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <button
                      onClick={() => handleUpdatePrice(price.id)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 border rounded text-xs hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-emerald-600 min-w-16 text-right">
                      ${price.precio.toFixed(2)}
                    </div>
                    <button
                      onClick={() => {
                        setEditingId(price.id);
                        setEditingPrice(price.precio.toString());
                      }}
                      className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletePrice(price.id)}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs"
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
