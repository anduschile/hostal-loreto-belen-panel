// src/app/api/empresas/route.ts
import { NextResponse } from "next/server";
import { getCompanies, createCompany } from "@/lib/data/companies";

export async function GET() {
  try {
    const companies = await getCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { message: "Failed to fetch companies", error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newCompany = await createCompany(body);
    return NextResponse.json(newCompany, { status: 201 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { message: "Failed to create company", error: errorMessage },
      { status: 500 }
    );
  }
}
