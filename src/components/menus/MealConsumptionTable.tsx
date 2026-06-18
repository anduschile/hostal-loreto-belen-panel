"use client";

import { useEffect, useState } from "react";
import { MealConsumption, Guest, Company } from "@/types/hostal";
import WhatsappPreviewModal from "./WhatsappPreviewModal";

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
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedConsumption, setSelectedConsumption] = useState<ConsumptionWithGuestAndCompany | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [serviceId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [consumptionRes, guestsRes, companiesRes] = await Promise.all([
        fetch(`/api/meal-services/${serviceId}/consumption`),
        fetch("/api/guests"),
        fetch("/api/companies"),
      ]);

      if (!consumptionRes.ok) throw new Error("Failed to fetch consumptions");

      const { data: consumptionData } = await consumptionRes.json();
      let guestsData: any = [];
      let companiesData: any = [];

      if (guestsRes.ok) {
        const guestsJson = await guestsRes.json();
        guestsData = guestsJson.data || [];
      }

      if (companiesRes.ok) {
        const companiesJson = await companiesRes.json();
        companiesData = companiesJson || [];
      }

      const guestsMap: Record<number, any> = {};
      const companiesMap: Record<number, any> = {};

      guestsData.forEach((g: any) => {
        guestsMap[g.id] = g;
      });

      companiesData.forEach((c: any) => {
        companiesMap[c.id] = c;
      });

      // Enrich consumption data with guest and company info
      const enrichedConsumptions = consumptionData.map((c: MealConsumption) => ({
        ...c,
        guest_full_name: guestsMap[c.guest_id]?.full_name || "Desconocido",
        company_name: c.company_id ? companiesMap[c.company_id]?.name : null,
        guest_phone: guestsMap[c.guest_id]?.phone,
      }));

      setConsumptions(enrichedConsumptions);
      setGuests(guestsMap);
      setCompanies(companiesMap);
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

  const handleToggleAnulado = async (consumptionId: number, currentEstado: string) => {
    const newEstado = currentEstado === "activo" ? "anulado" : "activo";
    const mensaje = newEstado === "anulado"
      ? "¿Confirmas que este servicio se anula? El registro se mantendrá para fines de facturación."
      : "¿Reactivar este servicio?";

    if (!confirm(mensaje)) return;

    try {
      setTogglingId(consumptionId);
      const res = await fetch(`/api/meal-consumption/${consumptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado_servicio: newEstado }),
      });

      if (!res.ok) throw new Error("Failed to update");

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const activeConsumptions = consumptions.filter((c) => c.estado_servicio === "activo");
  const cancelledConsumptions = consumptions.filter((c) => c.estado_servicio === "anulado");

  const stats = {
    total: activeConsumptions.length,
    chosenA: activeConsumptions.filter((c) => c.eleccion === "A").length,
    chosenB: activeConsumptions.filter((c) => c.eleccion === "B").length,
    pending: activeConsumptions.filter((c) => !c.eleccion).length,
    cancelled: cancelledConsumptions.length,
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
        <div className="grid grid-cols-5 gap-4 p-4 bg-emerald-50 rounded-lg">
          <div>
            <div className="text-2xl font-bold text-emerald-600">{stats.total}</div>
            <div className="text-xs text-gray-600">Total huéspedes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{stats.chosenA}</div>
            <div className="text-xs text-gray-600">Eligieron {menuAName}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{stats.chosenB}</div>
            <div className="text-xs text-gray-600">Eligieron {menuBName}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-xs text-gray-600">Sin respuesta</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-xs text-gray-600">Anulados</div>
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
            {consumptions.map((consumption) => {
              const isAnulado = consumption.estado_servicio === "anulado";
              return (
                <tr
                  key={consumption.id}
                  className={`${
                    isAnulado
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-150"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="border px-4 py-2">
                    <div className={`${isAnulado ? "font-normal" : "font-medium"}`}>
                      {consumption.guest_full_name}
                    </div>
                    {consumption.guest_phone && (
                      <div className="text-xs text-gray-500">{consumption.guest_phone}</div>
                    )}
                    {isAnulado && (
                      <div className="text-xs font-semibold text-red-600 mt-1">Anulado</div>
                    )}
                  </td>
                  <td className="border px-4 py-2 text-sm">
                    {consumption.company_name || "Particular"}
                  </td>
                  <td className="border px-4 py-2 text-xs text-center">
                    <span
                      className={`px-2 py-1 rounded ${
                        isAnulado
                          ? "bg-gray-200 text-gray-600"
                          : consumption.estado_whatsapp === "enviado"
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
                      <span className={`font-bold ${isAnulado ? "text-gray-600" : "text-emerald-600"}`}>
                        Opción {consumption.eleccion}
                      </span>
                    ) : (
                      <span className={isAnulado ? "text-gray-500" : "text-gray-500"}>-</span>
                    )}
                    {consumption.precio_snapshot && (
                      <div className={`text-xs ${isAnulado ? "text-gray-500" : "text-gray-600"}`}>
                        ${consumption.precio_snapshot.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="border px-4 py-2 text-center space-x-1">
                    <button
                      onClick={() => handleUpdateChoice(consumption.id, "A")}
                      disabled={isAnulado}
                      className={`px-2 py-1 rounded text-xs font-bold transition ${
                        isAnulado
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : consumption.eleccion === "A"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 hover:bg-blue-200"
                      }`}
                    >
                      A
                    </button>
                    <button
                      onClick={() => handleUpdateChoice(consumption.id, "B")}
                      disabled={isAnulado}
                      className={`px-2 py-1 rounded text-xs font-bold transition ${
                        isAnulado
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : consumption.eleccion === "B"
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
                      disabled={isAnulado}
                      className={`block w-full px-2 py-1 rounded transition ${
                        isAnulado
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateStatus(consumption.id, "sin_respuesta")
                      }
                      disabled={isAnulado}
                      className={`block w-full px-2 py-1 rounded transition ${
                        isAnulado
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-gray-600 text-white hover:bg-gray-700"
                      }`}
                    >
                      Sin respuesta
                    </button>
                    <button
                      onClick={() =>
                        handleToggleAnulado(
                          consumption.id,
                          consumption.estado_servicio
                        )
                      }
                      disabled={togglingId === consumption.id}
                      className={`block w-full px-2 py-1 rounded transition text-xs font-medium ${
                        isAnulado
                          ? "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          : "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      }`}
                    >
                      {togglingId === consumption.id
                        ? "Procesando..."
                        : isAnulado
                        ? "Reactivar"
                        : "Anular"}
                    </button>
                  </td>
                </tr>
              );
            })}
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
    </div>
  );
}
