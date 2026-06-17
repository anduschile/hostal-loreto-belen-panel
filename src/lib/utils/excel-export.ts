import * as XLSX from "xlsx";

export interface ExcelColumn {
  header: string;
  accessor: string;
}

export interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  rows: any[];
}

export function exportToExcel(filename: string, sheets: ExcelSheet[]): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    // Convert rows to include only the columns we want
    const data = sheet.rows.map((row) =>
      sheet.columns.reduce((acc, col) => {
        acc[col.header] = row[col.accessor];
        return acc;
      }, {} as any)
    );

    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Add to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  // Download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function createMealReportWorkbook(
  mealData: any[],
  summaryData: any[],
  empresa: string,
  desde: string,
  hasta: string
): string {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Comidas
  const mealSheet = XLSX.utils.json_to_sheet(mealData);
  XLSX.utils.book_append_sheet(workbook, mealSheet, "Comidas");

  // Sheet 2: Resumen
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

  // Generate filename
  const filename = `reporte_comidas_${empresa}_${desde}_${hasta}.xlsx`;

  // Write and return filename
  XLSX.writeFile(workbook, filename);

  return filename;
}
