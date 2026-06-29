"use client";

import { useEffect, useState } from "react";
import { MealConsumption, Guest, Company } from "@/types/hostal";
import WhatsappPreviewModal from "./WhatsappPreviewModal";
import AddManualGuestModal from "./AddManualGuestModal";

interface Props {
  serviceId: number;
  menuAName: string;
  menuBName: string;
  fecha: string;
  tipoServicio: string;
}

interface ConsumptionWithGuestAndCompany extends MealConsumption {
  guest_full_name?: string;
  company_name?: string | null;
  guest_phone?: string;
  menu_name?: string;
}

export default function MealConsumptionTable({
  serviceId,
  menuAName,
  menuBName,
  fecha,
  tipoServicio,
}: Props) {
  const [consumptions, setConsumptions] = useState<ConsumptionWithGuestAndCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guests, setGuests] = useState<Record<number, any>>({});
  const [companies, setCompanies] = useState<Record<number, any>>({});
  const [menus, setMenus] = useState<Record<number, any>>({});
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedConsumption, setSelectedConsumption] = useState<ConsumptionWithGuestAndCompany | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [addManualGuestModalOpen, setAddManualGuestModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [serviceId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [consumptionRes, guestsRes, companiesRes, menusRes] = await Promise.all([
        fetch(`/api/meal-services/${serviceId}/consumption`),
        fetch("/api/guests"),
        fetch("/api/companies"),
        fetch("/api/menus"),
      ]);

      if (!consumptionRes.ok) throw new Error("Failed to fetch consumptions");

      const { data: consumptionData } = await consumptionRes.json();
      let guestsData: any = [];
      let companiesData: any = [];
      let menusData: any = [];

      if (guestsRes.ok) {
        const guestsJson = await guestsRes.json();
        guestsData = guestsJson.data || [];
      }

      if (companiesRes.ok) {
        const companiesJson = await companiesRes.json();
        companiesData = companiesJson || [];
      }

      if (menusRes.ok) {
        const menusJson = await menusRes.json();
        menusData = menusJson.data || [];
      }

      const guestsMap: Record<number, any> = {};
      const companiesMap: Record<number, any> = {};
      const menusMap: Record<number, any> = {};

      guestsData.forEach((g: any) => {
        guestsMap[g.id] = g;
      });

      companiesData.forEach((c: any) => {
        companiesMap[c.id] = c;
      });

      menusData.forEach((m: any) => {
        menusMap[m.id] = m;
      });

      // Enrich consumption data with guest, company, and menu info
      const enrichedConsumptions = consumptionData.map((c: MealConsumption) => ({
        ...c,
        guest_full_name: guestsMap[c.guest_id]?.full_name || "Desconocido",
        company_name: c.company_id ? companiesMap[c.company_id]?.name : null,
        guest_phone: guestsMap[c.guest_id]?.phone,
        menu_name: c.menu_servido_id ? menusMap[c.menu_servido_id]?.nombre : null,
      }));

      setConsumptions(enrichedConsumptions);
      setGuests(guestsMap);
      setCompanies(companiesMap);
      setMenus(menusMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChoice = async (
    consumptionId: number,
    choice: "A" | "B" | null
  ) => {
    try {
      const res = await fetch(`/api/meal-consumption/${consumptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eleccion: choice }),
      });

      if (!res.ok) throw new Error("Failed to update");

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (
    consumptionId: number,
    status: string
  ) => {
    try {
      const res = await fetch(`/api/meal-consumption/${consumptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado_whatsapp: status }),
      });

      if (!res.ok) throw new Error("Failed to update");

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSyncGuests = async () => {
    try {
      setSyncLoading(true);
      setSyncMessage("");

      const res = await fetch(`/api/meal-services/${serviceId}/consumption/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha }),
      });

      if (!res.ok) throw new Error("Failed to sync guests");

      const { data } = await res.json();
      const { added, skipped } = data;

      if (added === 0) {
        setSyncMessage("No hay huéspedes nuevos para agregar");
      } else {
        setSyncMessage(`Se agregaron ${added} ${added === 1 ? "huésped" : "huéspedes"} nuevo${added === 1 ? "" : "s"}`);
        await fetchData();
      }

      setTimeout(() => setSyncMessage(""), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleRemoveFromService = async (consumptionId: number, guestName: string) => {
    const mensaje = `¿Confirmas eliminar a ${guestName} de este servicio? Esta acción no se puede deshacer y no quedará registro.`;

    if (!confirm(mensaje)) return;

    try {
      setRemovingId(consumptionId);
      const res = await fetch(`/api/meal-consumption/${consumptionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete");
      }

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  // Get names of first menu assigned (for stats display)
  const firstMenuAId = consumptions.find((c) => c.eleccion === "A")?.menu_servido_id;
  const firstMenuBId = consumptions.find((c) => c.eleccion === "B")?.menu_servido_id;
  const displayMenuAName = firstMenuAId ? menus[firstMenuAId]?.nombre : menuAName;
  const displayMenuBName = firstMenuBId ? menus[firstMenuBId]?.nombre : menuBName;

  const stats = {
    total: consumptions.length,
    chosenA: consumptions.filter((c) => c.eleccion === "A").length,
    chosenB: consumptions.filter((c) => c.eleccion === "B").length,
    pending: consumptions.filter((c) => !c.eleccion).length,
  };

  if (loading) return <div className="text-sm text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-4 p-4 bg-emerald-50 rounded-lg">
          <div>
            <div className="text-2xl font-bold text-emerald-600">{stats.total}</div>
            <div className="text-xs text-gray-600">Total huéspedes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{stats.chosenA}</div>
            <div className="text-xs text-gray-600">Eligieron {displayMenuAName}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{stats.chosenB}</div>
            <div className="text-xs text-gray-600">Eligieron {displayMenuBName}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-xs text-gray-600">Sin respuesta</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncGuests}
            disabled={syncLoading}
            className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-50 text-sm font-medium"
          >
            {syncLoading ? "Sincronizando..." : "🔄 Sincronizar huéspedes"}
          </button>
          <button
            onClick={() => setAddManualGuestModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-medium"
          >
            ➕ Agregar huésped manual
          </button>
          {syncMessage && (
            <div className="text-sm text-cyan-700 font-medium">
              {syncMessage}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-100">
            <tr>
              <th className="border px-4 py-2 text-left font-semibold">Huésped</th>
              <th className="border px-4 py-2 text-left font-semibold">Empresa</th>
              <th className="border px-4 py-2 text-left font-semibold">WhatsApp</th>
              <th className="border px-4 py-2 text-left font-semibold">Estado</th>
              <th className="border px-4 py-2 text-left font-semibold">Elección</th>
              <th className="border px-4 py-2 text-left font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {consumptions.map((consumption) => (
              <tr key={consumption.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">
                  <div className="font-medium">
                    {consumption.guest_full_name}
                  </div>
                  {consumption.guest_phone && (
                    <div className="text-xs text-gray-500">{consumption.guest_phone}</div>
                  )}
                </td>
                <td className="border px-4 py-2 text-sm">
                  {consumption.company_name || "Particular"}
                </td>
                <td className="border px-4 py-2 text-xs text-center">
                  <span
                    className={`px-2 py-1 rounded ${
                      consumption.estado_whatsapp === "enviado"
                        ? "bg-green-100 text-green-700"
                        : consumption.estado_whatsapp === "respondido"
                        ? "bg-blue-100 text-blue-700"
                        : consumption.estado_whatsapp === "sin_respuesta"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {consumption.estado_whatsapp}
                  </span>
                </td>
                <td className="border px-4 py-2 text-sm">
                  {consumption.eleccion ? (
                    <div className="font-bold text-emerald-600">
                      {consumption.eleccion}: {consumption.menu_name || (consumption.eleccion === "A" ? menuAName : menuBName)}
                    </div>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                  {consumption.precio_snapshot && (
                    <div className="text-xs text-gray-600">
                      ${consumption.precio_snapshot.toFixed(2)}
                    </div>
                  )}
                </td>
                <td className="border px-4 py-2 text-center space-x-1">
                  <button
                    onClick={() => handleUpdateChoice(consumption.id, "A")}
                    className={`px-2 py-1 rounded text-xs font-bold transition ${
                      consumption.eleccion === "A"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 hover:bg-blue-200"
                    }`}
                  >
                    A
                  </button>
                  <button
                    onClick={() => handleUpdateChoice(consumption.id, "B")}
                    className={`px-2 py-1 rounded text-xs font-bold transition ${
                      consumption.eleccion === "B"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-200 hover:bg-purple-200"
                    }`}
                  >
                    B
                  </button>
                </td>
                <td className="border px-4 py-2 text-xs space-x-1 space-y-1">
                  <button
                    onClick={() => {
                      setSelectedConsumption(consumption);
                      setWhatsappModalOpen(true);
                    }}
                    className="block w-full px-2 py-1 rounded transition bg-green-600 text-white hover:bg-green-700"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateStatus(consumption.id, "sin_respuesta")
                    }
                    className="block w-full px-2 py-1 rounded transition bg-gray-600 text-white hover:bg-gray-700"
                  >
                    Sin respuesta
                  </button>
                  <button
                    onClick={() =>
                      handleRemoveFromService(
                        consumption.id,
                        consumption.guest_full_name
                      )
                    }
                    disabled={removingId === consumption.id}
                    className="block w-full px-2 py-1 rounded transition text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {removingId === consumption.id ? "Eliminando..." : "Quitar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedConsumption && (
        <WhatsappPreviewModal
          open={whatsappModalOpen}
          onClose={() => {
            setWhatsappModalOpen(false);
            setSelectedConsumption(null);
          }}
          consumption={selectedConsumption}
          menuAName={menuAName}
          menuBName={menuBName}
          fecha={fecha}
          tipoServicio={tipoServicio}
          onSent={fetchData}
        />
      )}

      <AddManualGuestModal
        open={addManualGuestModalOpen}
        onClose={() => setAddManualGuestModalOpen(false)}
        serviceId={serviceId}
        onSuccess={fetchData}
      />
    </div>
  );
}
