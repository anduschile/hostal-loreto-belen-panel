import { NextResponse } from "next/server";
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
} from "@/lib/data/payments";
import { PaymentSchema, PaymentUpdateSchema } from "@/lib/validators/payments";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from") || undefined;
    const toDate = searchParams.get("to") || undefined;

    const payments = await getPayments({ fromDate, toDate });

    return NextResponse.json({
      ok: true,
      data: payments,
    });
  } catch (error: any) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al obtener pagos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validar payload con Zod
    const validation = PaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Datos inválidos",
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    // 2. Crear en DB
    const newPayment = await createPayment(validation.data as any);

    return NextResponse.json({
      ok: true,
      data: newPayment,
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al crear el pago" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // 1. Validar payload con Zod
    const validation = PaymentUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Datos inválidos para actualización",
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const { id, ...dataToUpdate } = validation.data;

    // 2. Actualizar en DB
    const updatedPayment = await updatePayment(id, dataToUpdate as any);

    return NextResponse.json({
      ok: true,
      data: updatedPayment,
    });

  } catch (error: any) {
    console.error("PUT /api/payments error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al actualizar el pago" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID es obligatorio" }, { status: 400 });
    }

    await deletePayment(Number(id));

    return NextResponse.json({ ok: true, message: "Pago eliminado correctamente" });

  } catch (error: any) {
    console.error("DELETE /api/payments error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al eliminar el pago" },
      { status: 500 }
    );
  }
}
