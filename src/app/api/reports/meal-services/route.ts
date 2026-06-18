import { NextResponse } from "next/server";
import { getMealReportData } from "@/lib/data/meal-report";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const companyIdParam = searchParams.get("company_id");
    const tipoServicio = searchParams.get("tipo_servicio");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { ok: false, error: "from and to dates are required" },
        { status: 400 }
      );
    }

    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;

    const data = await getMealReportData(fromDate, toDate, companyId, tipoServicio);

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
