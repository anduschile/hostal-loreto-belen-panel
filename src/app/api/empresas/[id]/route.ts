// src/app/api/empresas/[id]/route.ts
import { NextResponse } from "next/server";
import {
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "@/lib/data/companies";

interface Params {
  params: {
    id: string;
  };
}

export async function GET(_req: Request, { params }: Params) {
  const numericId = Number(params.id);

  if (Number.isNaN(numericId)) {
    return NextResponse.json(
      { message: "ID inválido" },
      { status: 400 }
    );
  }

  try {
    const company = await getCompanyById(numericId);
    if (!company) {
      return NextResponse.json(
        { message: "Empresa no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(company);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { message: "Failed to fetch company", error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const numericId = Number(params.id);

  if (Number.isNaN(numericId)) {
    return NextResponse.json(
      { message: "ID inválido" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const updatedCompany = await updateCompany(numericId, body);
    return NextResponse.json(updatedCompany);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { message: "Failed to update company", error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const numericId = Number(params.id);

  if (Number.isNaN(numericId)) {
    return NextResponse.json(
      { message: "ID inválido" },
      { status: 400 }
    );
  }

  try {
    await deleteCompany(numericId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { message: "Failed to delete company", error: errorMessage },
      { status: 500 }
    );
  }
}
