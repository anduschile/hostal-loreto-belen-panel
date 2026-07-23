import { NextResponse } from "next/server";
import { getMealReportData, getMealReportSummary } from "@/lib/data/meal-report";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

function formatDateCLForExcel(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr + "T00:00:00Z");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr || "";
  }
}

function applyBorderStyle(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const companyIdParam = searchParams.get("company_id");
    const tipoServicio = searchParams.get("tipo_servicio");
    const companyName = searchParams.get("company_name") || "Desconocida";

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { ok: false, error: "from and to dates are required" },
        { status: 400 }
      );
    }

    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;

    // Get meal data
    const mealData = await getMealReportData(fromDate, toDate, companyId, tipoServicio);
    const summaryData = await getMealReportSummary(fromDate, toDate, companyId);

    // Calculate totals for summary section
    const totalPriceNeto = mealData.reduce((sum, row) => sum + (row.precio ? row.precio : 0), 0);
    const totalPriceConIva = mealData.reduce((sum, row) => sum + (row.precio_con_iva ? row.precio_con_iva : 0), 0);

    let totalAlmuerzos = 0;
    let totalCenas = 0;
    let totalMontoAlmuerzos = 0;
    let totalMontoCenas = 0;

    if (summaryData.length > 0) {
      totalAlmuerzos = summaryData.reduce((sum, row) => sum + (row.almuerzos_qty || 0), 0);
      totalCenas = summaryData.reduce((sum, row) => sum + (row.cenas_qty || 0), 0);
      totalMontoAlmuerzos = summaryData.reduce((sum, row) => sum + (row.total_almuerzos || 0), 0);
      totalMontoCenas = summaryData.reduce((sum, row) => sum + (row.total_cenas || 0), 0);
    }

    const totalConIvaGeneral = Math.round(totalPriceConIva);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Servicios de Comida");

    // Define columns (order: Fecha | Huésped | Tipo Servicio | Menú Servido | Precio Neto | Precio con IVA | Empresa)
    worksheet.columns = [
      { header: "FECHA", key: "fecha" },
      { header: "HUÉSPED", key: "huesped" },
      { header: "TIPO SERVICIO", key: "tipo_servicio" },
      { header: "MENÚ SERVIDO", key: "menu_servido" },
      { header: "PRECIO NETO", key: "precio_neto" },
      { header: "PRECIO CON IVA", key: "precio_con_iva" },
      { header: "EMPRESA", key: "empresa" },
    ];

    // Landscape orientation, fit all columns to one page wide (print-friendly)
    worksheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    // Style header row (row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFBDD7EE" },
      };
      cell.font = { bold: true, color: { argb: "FF000000" } };
      cell.alignment = { horizontal: "center", vertical: "center" };
      applyBorderStyle(cell);
    });

    // Add data rows
    mealData.forEach((row, index) => {
      const rowNum = index + 2; // Start from row 2 (after header)
      const isOddRow = (index + 1) % 2 === 1; // Check if odd (1st, 3rd, 5th...)

      const newRow = worksheet.addRow({
        fecha: formatDateCLForExcel(row.fecha),
        huesped: row.guest_full_name,
        empresa: row.company_name || "Particular",
        tipo_servicio: row.tipo_servicio.charAt(0).toUpperCase() + row.tipo_servicio.slice(1),
        menu_servido: row.eleccion ? row.menu_nombre : "Sin respuesta",
        precio_neto: row.precio !== null ? row.precio : "Pendiente",
        precio_con_iva: row.precio_con_iva !== null ? row.precio_con_iva : "Pendiente",
      });

      // Apply styles to data rows
      const columnAlignments = [
        "center", // FECHA
        "left",   // HUÉSPED
        "center", // TIPO SERVICIO
        "left",   // MENÚ SERVIDO
        "center", // PRECIO NETO
        "center", // PRECIO CON IVA
        "left",   // EMPRESA
      ];

      newRow.eachCell((cell, colNum) => {
        // Set background color
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isOddRow ? "FFEBF3FB" : "FFFFFFFF" },
        };

        // Set alignment
        cell.alignment = { horizontal: columnAlignments[colNum - 1] as any };

        // Set border
        applyBorderStyle(cell);

        // Apply number format for price columns (neto and con IVA)
        if ((colNum === 5 || colNum === 6) && typeof cell.value === "number") {
          cell.numFmt = '"$"#,##0';
        } else if ((colNum === 5 || colNum === 6) && cell.value === "Pendiente") {
          cell.font = { italic: true, color: { argb: "FF808080" } };
        }
      });
    });

    // Add total row
    const totalRowNum = mealData.length + 2;
    const totalRow = worksheet.addRow({
      fecha: "",
      huesped: "",
      empresa: "",
      tipo_servicio: "",
      menu_servido: "TOTAL:",
      precio_neto: totalPriceNeto,
      precio_con_iva: totalPriceConIva,
    });

    totalRow.eachCell((cell, colNum) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFBDD7EE" },
      };
      cell.font = { bold: true };
      applyBorderStyle(cell);

      // Align TOTAL label to right
      if (colNum === 4) {
        cell.alignment = { horizontal: "right" };
      } else if (colNum === 5 || colNum === 6) {
        cell.alignment = { horizontal: "center" };
      }

      // Apply currency format to price columns
      if ((colNum === 5 || colNum === 6) && typeof cell.value === "number") {
        cell.numFmt = '"$"#,##0';
      }
    });

    // Add empty separator row
    const separatorRowNum = totalRowNum + 1;
    worksheet.addRow({});

    // Add summary section
    const summaryRows = [
      { label: "Cantidad Almuerzos:", value: totalAlmuerzos, isNumeric: true },
      { label: "Cantidad Cenas:", value: totalCenas, isNumeric: true },
      { label: "Monto Neto Almuerzos:", value: totalMontoAlmuerzos, isNumeric: false },
      { label: "Monto Neto Cenas:", value: totalMontoCenas, isNumeric: false },
      { label: "Total Neto General:", value: totalPriceNeto, isNumeric: false },
      { label: "Total con IVA (19%):", value: totalConIvaGeneral, isNumeric: false },
    ];

    summaryRows.forEach((summaryRow) => {
      const row = worksheet.addRow({
        fecha: "",
        huesped: "",
        empresa: summaryRow.label,
        tipo_servicio: "",
        menu_servido: "",
        precio_neto: summaryRow.value,
        precio_con_iva: "",
      });

      row.eachCell((cell, colNum) => {
        // Bold labels in column 7 (EMPRESA)
        if (colNum === 7) {
          cell.font = { bold: true };
          cell.alignment = { horizontal: "left" };
        }
        // Format price columns
        else if (colNum === 5 && typeof cell.value === "number") {
          cell.alignment = { horizontal: "center" };
          if (!summaryRow.isNumeric) {
            cell.numFmt = '"$"#,##0';
          }
        }

        applyBorderStyle(cell);
      });
    });

    // Excel column width units are calibrated to the digit "0" glyph; uppercase letters
    // render noticeably wider than that unit, so a raw character count underestimates
    // the width needed for all-caps content (common in guest names and menu text) and
    // causes visual clipping even with padding. Weight characters by rendered width instead.
    function estimateExcelWidth(text: string): number {
      let width = 0;
      for (const ch of text) {
        if (ch >= "A" && ch <= "Z") {
          width += 1.3;
        } else if (ch === " " || "iIlj.,:;'!|".includes(ch)) {
          width += 0.5;
        } else {
          width += 1.0;
        }
      }
      return width;
    }

    // Auto-fit column widths to the actual content (header vs. widest cell), plus padding
    const columnCount = worksheet.columns.length;
    for (let colNum = 1; colNum <= columnCount; colNum++) {
      let maxLen = 0;
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const cell = row.getCell(colNum);
        if (cell.value === null || cell.value === undefined) return;

        let text: string;
        if (typeof cell.value === "number" && cell.numFmt) {
          text = `$${Math.round(cell.value).toLocaleString("es-CL")}`;
        } else {
          text = String(cell.value);
        }

        const len = estimateExcelWidth(text);
        if (len > maxLen) maxLen = len;
      });
      worksheet.getColumn(colNum).width = Math.ceil(maxLen) + 3;
    }

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();

    // Format dates for filename
    const dateFromParts = fromDate.split("-");
    const dateToParts = toDate.split("-");
    const fromDateFormatted = `${dateFromParts[2]}-${dateFromParts[1]}-${dateFromParts[0]}`;
    const toDateFormatted = `${dateToParts[2]}-${dateToParts[1]}-${dateToParts[0]}`;

    const filename = `reporte_comidas_${companyName}_${fromDateFormatted}_al_${toDateFormatted}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
