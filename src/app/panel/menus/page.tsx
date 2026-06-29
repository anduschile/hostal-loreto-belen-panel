"use client";

import { useState, useEffect } from "react";
import MenuFormModal from "@/components/menus/MenuFormModal";
import MenuPriceManager from "@/components/menus/MenuPriceManager";
import MealServiceModal from "@/components/menus/MealServiceModal";
import { HostalMenu, MealService } from "@/types/hostal";
import { formatDateCL } from "@/lib/utils/date";
import { toast } from "sonner";

export default function MenusPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "programming">("catalog");
  const [menus, setMenus] = useState<HostalMenu[]>([]);
  const [mealServices, setMealServices] = useState<MealService[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const getDefaultDateRange = () => {
    const today = new Date();
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      from: oneMonthAgo.toISOString().split("T")[0],
      to: weekFromNow.toISOString().split("T")[0],
    };
  };

  const defaultRange = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);

  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<HostalMenu | null>(null);
  const [selectedMenuForPrices, setSelectedMenuForPrices] =
    useState<HostalMenu | null>(null);
  const [showPriceManager, setShowPriceManager] = useState(false);

  const [mealServiceModalOpen, setMealServiceModalOpen] = useState(false);
  const [selectedMealService, setSelectedMealService] =
    useState<MealService | null>(null);

  useEffect(() => {
    if (activeTab === "catalog") {
      fetchMenus();
    } else {
      fetchMealServices();
      if (menus.length === 0) {
        fetchMenus();
      }
    }
  }, [activeTab]);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const params = searchTerm ? `?search=${searchTerm}` : "";
      const res = await fetch(`/api/menus${params}`);
      if (!res.ok) throw new Error("Failed to fetch menus");
      const { data } = await res.json();
      setMenus(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMealServices = async (from?: string, to?: string) => {
    try {
      setLoading(true);
      const fromDate = from || dateFrom;
      const toDate = to || dateTo;

      const res = await fetch(
        `/api/meal-services?from=${fromDate}&to=${toDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch meal services");
      const { data } = await res.json();
      setMealServices(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMenu = async (data: any) => {
    try {
      const method = selectedMenu ? "PUT" : "POST";
      const url = selectedMenu ? `/api/menus/${selectedMenu.id}` : "/api/menus";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save menu");

      toast.success(selectedMenu ? "Menú actualizado" : "Menú creado");
      setMenuFormOpen(false);
      setSelectedMenu(null);
      await fetchMenus();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteMenu = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este menú?")) return;

    try {
      const res = await fetch(`/api/menus/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to delete menu");
      }

      toast.success("Menú eliminado");
      await fetchMenus();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveMealService = async (data: any) => {
    try {
      const method = selectedMealService ? "PUT" : "POST";
      const url = selectedMealService
        ? `/api/meal-services/${selectedMealService.id}`
        : "/api/meal-services";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save meal service");

      toast.success(
        selectedMealService ? "Servicio actualizado" : "Servicio creado"
      );
      setMealServiceModalOpen(false);
      setSelectedMealService(null);
      await fetchMealServices();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteMealService = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este servicio?"))
      return;

    try {
      const res = await fetch(`/api/meal-services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete meal service");

      toast.success("Servicio eliminado");
      await fetchMealServices();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Menús</h1>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === "catalog"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Catálogo
        </button>
        <button
          onClick={() => setActiveTab("programming")}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === "programming"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Programación
        </button>
      </div>

      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Buscar menú por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={() => fetchMenus()}
              className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={() => {
                setSelectedMenu(null);
                setShowPriceManager(false);
                setMenuFormOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
            >
              + Nuevo Menú
            </button>
          </div>

          {showPriceManager && selectedMenuForPrices && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-bold mb-4">
                Gestionar Precios: {selectedMenuForPrices.nombre}
              </h3>
              <MenuPriceManager menuId={selectedMenuForPrices.id} />
              <button
                onClick={() => setShowPriceManager(false)}
                className="mt-4 px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : menus.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay menús disponibles
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {menus.map((menu) => (
                <div key={menu.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                  {menu.foto_url && (
                    <img
                      src={menu.foto_url}
                      alt={menu.nombre}
                      className="w-full h-40 object-cover rounded mb-3"
                    />
                  )}
                  <h3 className="font-bold text-lg">{menu.nombre}</h3>
                  {menu.descripcion && (
                    <p className="text-sm text-gray-600 mb-2">
                      {menu.descripcion}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setSelectedMenu(menu);
                        setMenuFormOpen(true);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMenuForPrices(menu);
                        setShowPriceManager(true);
                      }}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                    >
                      Precios
                    </button>
                    <button
                      onClick={() => handleDeleteMenu(menu.id)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "programming" && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <button
                onClick={() => fetchMealServices(dateFrom, dateTo)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm"
              >
                Buscar
              </button>
              <button
                onClick={() => {
                  const defaultRange = getDefaultDateRange();
                  setDateFrom(defaultRange.from);
                  setDateTo(defaultRange.to);
                  fetchMealServices(defaultRange.from, defaultRange.to);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 font-medium text-sm"
              >
                Hoy y próximos 7 días
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedMealService(null);
              setMealServiceModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
          >
            + Programar Servicio
          </button>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : mealServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay servicios programados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border px-4 py-2 text-left font-semibold">
                      Fecha
                    </th>
                    <th className="border px-4 py-2 text-left font-semibold">
                      Tipo
                    </th>
                    <th className="border px-4 py-2 text-left font-semibold">
                      Menú A
                    </th>
                    <th className="border px-4 py-2 text-left font-semibold">
                      Menú B
                    </th>
                    <th className="border px-4 py-2 text-center font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mealServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{formatDateCL(service.fecha)}</td>
                      <td className="border px-4 py-2 capitalize">
                        {service.tipo_servicio}
                      </td>
                      <td className="border px-4 py-2">
                        {menus.find(m => m.id === service.menu_a_id)?.nombre || `Menú ${service.menu_a_id}`}
                      </td>
                      <td className="border px-4 py-2">
                        {menus.find(m => m.id === service.menu_b_id)?.nombre || `Menú ${service.menu_b_id}`}
                      </td>
                      <td className="border px-4 py-2 text-center space-x-2">
                        <a
                          href={`/panel/menus/programar?serviceId=${service.id}`}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Gestionar
                        </a>
                        <button
                          onClick={() => {
                            setSelectedMealService(service);
                            setMealServiceModalOpen(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteMealService(service.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <MenuFormModal
        open={menuFormOpen}
        onClose={() => {
          setMenuFormOpen(false);
          setSelectedMenu(null);
        }}
        onSave={handleSaveMenu}
        menu={selectedMenu}
      />

      <MealServiceModal
        open={mealServiceModalOpen}
        onClose={() => {
          setMealServiceModalOpen(false);
          setSelectedMealService(null);
        }}
        onSave={handleSaveMealService}
        mealService={selectedMealService}
      />
    </div>
  );
}
