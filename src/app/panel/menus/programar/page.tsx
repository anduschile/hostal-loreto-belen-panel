"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MealService, HostalMenu } from "@/types/hostal";
import MealConsumptionTable from "@/components/menus/MealConsumptionTable";
import { formatDateCL } from "@/lib/utils/date";
import { toast } from "sonner";

export default function ProgramarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceId = searchParams.get("serviceId");

  const [mealService, setMealService] = useState<MealService | null>(null);
  const [menus, setMenus] = useState<Record<number, HostalMenu>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (serviceId) {
      fetchData();
    } else {
      setError("No se especificó un servicio");
      setLoading(false);
    }
  }, [serviceId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch meal service
      const serviceRes = await fetch(`/api/meal-services/${serviceId}`);
      if (!serviceRes.ok) throw new Error("Servicio no encontrado");

      const { data: serviceData } = await serviceRes.json();
      setMealService(serviceData);

      // Fetch all menus for display
      const menusRes = await fetch("/api/menus");
      if (menusRes.ok) {
        const { data: menusData } = await menusRes.json();
        const menusMap: Record<number, HostalMenu> = {};
        menusData.forEach((m: HostalMenu) => {
          menusMap[m.id] = m;
        });
        setMenus(menusMap);
      }

      // Auto-load meal consumption if empty
      const consumptionRes = await fetch(
        `/api/meal-services/${serviceId}/consumption`
      );
      if (consumptionRes.ok) {
        const { data: consumptionData } = await consumptionRes.json();

        if (consumptionData.length === 0) {
          // Auto-load guests with active reservations
          const autoloadRes = await fetch(
            `/api/meal-services/${serviceId}/consumption`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fecha: serviceData.fecha,
                action: "autoload",
              }),
            }
          );

          if (autoloadRes.ok) {
            toast.success("Huéspedes cargados automáticamente");
          } else if (autoloadRes.status === 409) {
            const { error } = await autoloadRes.json();
            toast.warning(error || "Agrega huéspedes manualmente para este servicio");
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando...</div>;
  }

  if (error || !mealService) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-100 text-red-700 rounded">
          {error || "Servicio no encontrado"}
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 border rounded hover:bg-gray-100"
        >
          Volver
        </button>
      </div>
    );
  }

  const menuA = menus[mealService.menu_a_id];
  const menuB = menus[mealService.menu_b_id];

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:underline text-sm mb-4"
        >
          ← Volver
        </button>

        <h1 className="text-3xl font-bold mb-4">
          Programación del {formatDateCL(mealService.fecha)}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border rounded-lg p-4 bg-slate-50">
            <h3 className="text-sm font-bold text-gray-600 mb-2">
              Tipo de Servicio
            </h3>
            <p className="text-lg font-bold capitalize">{mealService.tipo_servicio}</p>
          </div>

          <div className="border rounded-lg p-4 bg-slate-50">
            <h3 className="text-sm font-bold text-gray-600 mb-2">Menús</h3>
            <p className="text-lg">
              <span className="font-bold">A:</span> {menuA?.nombre || "Cargando..."}{" "}
              | <span className="font-bold">B:</span> {menuB?.nombre || "Cargando..."}
            </p>
          </div>
        </div>

        {mealService.notas && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-bold text-blue-900 mb-2">Notas</h3>
            <p className="text-blue-800">{mealService.notas}</p>
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mb-4">Huéspedes y Elecciones</h2>

      {menuA && menuB && (
        <MealConsumptionTable
          serviceId={parseInt(serviceId as string)}
          menuAName={menuA.nombre}
          menuBName={menuB.nombre}
          fecha={mealService.fecha}
          tipoServicio={mealService.tipo_servicio}
        />
      )}
    </div>
  );
}
