export function formatDateCL(dateStr: string | null | undefined): string {
  if (!dateStr) return "";

  try {
    const date = new Date(dateStr + "T00:00:00Z");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

export function formatCurrencyCLP(value: number | null | undefined): string {
  if (value === null || value === undefined) return "$0";
  return `$${Math.round(value).toLocaleString("es-CL")}`;
}
