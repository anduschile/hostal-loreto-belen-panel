"use client";

import { useState, useEffect } from "react";
import { Company } from "@/types/hostal";
import { formatDateCL, formatCurrencyCLP } from "@/lib/utils/date";

export default function MealServiceReport() {
  const [fromDate, setFromDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  );
  const [toDate, setToDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [tipoServicio, setTipoServicio] = useState<string>("");
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const companiesData = await res.json();
        const companies = companiesData || [];
        setCompanies(companies);
        // Default to Multiexport if it exists
        const multiexport = companies.find(
          (c: Company) => c.name.toLowerCase().includes("multiexport")
        );
        if (multiexport) {
          setSelectedCompanyId(multiexport.id.toString());
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch companies:", err);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
      });

      if (selectedCompanyId) {
        params.append("company_id", selectedCompanyId);
      }

      if (tipoServicio) {
        params.append("tipo_servicio", tipoServicio);
      }

      const res = await fetch(`/api/reports/meal-services?${params}`);
      if (!res.ok) throw new Error("Failed to fetch report");

      const { data } = await res.json();
      setReportData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
      });

      if (selectedCompanyId) {
        params.append("company_id", selectedCompanyId);
      }

      if (tipoServicio) {
        params.append("tipo_servicio", tipoServicio);
      }

      const selectedCompany = companies.find(
        (c) => c.id.toString() === selectedCompanyId
      );
      if (selectedCompany) {
        params.append("company_name", selectedCompany.name);
      }

      const res = await fetch(
        `/api/reports/meal-services/export?${params}`
      );
      if (!res.ok) throw new Error("Failed to export");

      // Backend now returns binary Excel file directly
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") || "reporte_comidas.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totalPriceNeto = reportData.reduce((sum, row) => sum + (row.precio ? row.precio : 0), 0);
  const totalPriceConIva = reportData.reduce((sum, row) => sum + (row.precio_con_iva ? row.precio_con_iva : 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Desde</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hasta</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Empresa</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <select
            value={tipoServicio}
            onChange={(e) => setTipoServicio(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">Ambos</option>
            <option value="almuerzo">Almuerzo</option>
            <option value="cena">Cena</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? "Generando..." : "Generar Reporte"}
        </button>
        <button
          onClick={handleExportExcel}
          disabled={loading || reportData.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          📥 Exportar Excel
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {reportData.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border px-4 py-2 text-left font-semibold">
                    Fecha
                  </th>
                  <th className="border px-4 py-2 text-left font-semibold">
                    Huésped
                  </th>
                  <th className="border px-4 py-2 text-left font-semibold">
                    Empresa
                  </th>
                  <th className="border px-4 py-2 text-left font-semibold">
                    Tipo Servicio
                  </th>
                  <th className="border px-4 py-2 text-left font-semibold">
                    Menú Servido
                  </th>
                  <th className="border px-4 py-2 text-right font-semibold">
                    Precio Neto
                  </th>
                  <th className="border px-4 py-2 text-right font-semibold">
                    Precio con IVA
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{formatDateCL(row.fecha)}</td>
                    <td className="border px-4 py-2">{row.guest_full_name}</td>
                    <td className="border px-4 py-2">
                      {row.company_name || "Particular"}
                    </td>
                    <td className="border px-4 py-2 capitalize">
                      {row.tipo_servicio}
                    </td>
                    <td className="border px-4 py-2">
                      {row.eleccion ? row.menu_nombre : <span className="text-gray-500 italic">Sin respuesta</span>}
                    </td>
                    <td className="border px-4 py-2 text-right font-semibold">
                      {row.precio !== null ? formatCurrencyCLP(row.precio) : <span className="text-gray-500 italic">Pendiente</span>}
                    </td>
                    <td className="border px-4 py-2 text-right font-semibold">
                      {row.precio_con_iva !== null ? formatCurrencyCLP(row.precio_con_iva) : <span className="text-gray-500 italic">Pendiente</span>}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-emerald-50">
                  <td colSpan={5} className="border px-4 py-2 text-right">
                    TOTAL:
                  </td>
                  <td className="border px-4 py-2 text-right text-emerald-600">
                    {formatCurrencyCLP(totalPriceNeto)}
                  </td>
                  <td className="border px-4 py-2 text-right text-emerald-600">
                    {formatCurrencyCLP(totalPriceConIva)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
