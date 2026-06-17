import { NextResponse } from "next/server";
import { getMealReportData, getMealReportSummary } from "@/lib/data/meal-report";
import { createMealReportWorkbook } from "@/lib/utils/excel-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const companyIdParam = searchParams.get("company_id");
    const companyName = searchParams.get("company_name") || "Desconocida";

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { ok: false, error: "from and to dates are required" },
        { status: 400 }
      );
    }

    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;

    // Get meal data
    const mealData = await getMealReportData(fromDate, toDate, companyId);
    const summaryData = await getMealReportSummary(fromDate, toDate, companyId);

    // Format data for Excel
    const mealSheetData = mealData.map((row) => ({
      Fecha: row.fecha,
      Huésped: row.guest_full_name,
      Empresa: row.company_name || "Particular",
      "Tipo Servicio": row.tipo_servicio,
      "Menú Servido": row.eleccion ? row.menu_nombre : "Sin respuesta",
      Precio: row.precio !== null ? row.precio : "Pendiente de confirmar",
    }));

    // Add totals row
    const totalPrice = mealData.reduce((sum, row) => sum + (row.precio ? row.precio : 0), 0);
    mealSheetData.push({
      Fecha: "TOTAL",
      Huésped: "",
      Empresa: "",
      "Tipo Servicio": "",
      "Menú Servido": "",
      Precio: totalPrice,
    });

    const summarySheetData = summaryData.map((row) => ({
      Empresa: row.company_name,
      "Almuerzos (qty)": row.almuerzos_qty,
      "Cenas (qty)": row.cenas_qty,
      "Total Almuerzos ($)": row.total_almuerzos,
      "Total Cenas ($)": row.total_cenas,
      "Total General ($)": row.total_general,
    }));

    // Create workbook (this function writes the file in the browser)
    // But we're on the server, so we need to return the data for the client to handle
    return NextResponse.json({
      ok: true,
      data: {
        mealSheet: mealSheetData,
        summarySheet: summarySheetData,
        fromDate,
        toDate,
        companyName,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
