"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Payment } from "@/types/hostal";
import { formatCurrencyCLP } from "@/lib/formatters";
import { toast } from "sonner";

type Props = {
  initialPayments: Payment[];
  initialFrom?: string;
  initialTo?: string;
};

export default function PagosClient({
  initialPayments,
  initialFrom,
  initialTo,
}: Props) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [fromDate, setFromDate] = useState(initialFrom || "");
  const [toDate, setToDate] = useState(initialTo || "");

  // Estado del modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // States for UX
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("efectivo");
  const [formDocumentType, setFormDocumentType] = useState("boleta");
  const [formDocumentNumber, setFormDocumentNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formReservationId, setFormReservationId] = useState("");
  const [formGuestId, setFormGuestId] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    router.push(`/panel/pagos?${params.toString()}`);
  };

  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  const openNewPayment = () => {
    setEditingPayment(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAmount("");
    setFormMethod("efectivo");
    setFormDocumentType("boleta");
    setFormDocumentNumber("");
    setFormNotes("");
    setFormReservationId("");
    setFormGuestId("");
    setFormCompanyId("");
    setIsModalOpen(true);
  };

  const openEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setFormDate(payment.payment_date);
    setFormAmount(String(payment.amount));
    setFormMethod(payment.method);
    setFormDocumentType(payment.document_type);
    setFormDocumentNumber(payment.document_number || "");
    setFormNotes(payment.notes || "");
    setFormReservationId(payment.reservation_id ? String(payment.reservation_id) : "");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return;

    const toastId = toast.loading("Eliminando pago...");
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/payments?id=${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Error al eliminar");

      setPayments((prev) => prev.filter((p) => p.id !== id));
      toast.success("Pago eliminado correctamente", { id: toastId });
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formReservationId) {
      toast.error("Debes asociar una reserva al pago (ID Reserva obligatorio)");
      return;
    }

    const payload = {
      payment_date: formDate,
      amount: Number(formAmount),
      method: formMethod,
      document_type: formDocumentType,
      document_number: formDocumentNumber || null,
      notes: formNotes,
      reservation_id: Number(formReservationId),
      guest_id: formGuestId ? Number(formGuestId) : null,
      company_id: formCompanyId ? Number(formCompanyId) : null,
    };

    const toastId = toast.loading(editingPayment ? "Actualizando pago..." : "Registrando pago...");
    setIsSubmitting(true);

    try {
      let res;
      if (editingPayment) {
        // Update
        res = await fetch("/api/payments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingPayment.id, ...payload }),
        });
      } else {
        // Create
        res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!data.ok) {
        if (data.details) {
          console.error(data.details);
          throw new Error(data.error + " (Ver consola para detalles)");
        }
        throw new Error(data.error || "Error al guardar");
      }

      if (editingPayment) {
        setPayments(prev => prev.map(p => p.id === data.data.id ? data.data : p));
        toast.success("Pago actualizado", { id: toastId });
      } else {
        setPayments(prev => [data.data, ...prev]);
        toast.success("Pago registrado correctamente", { id: toastId });
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Totales
  const totalAmount = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalByMethod = payments.reduce((acc, p) => {
    const method = p.method as string;
    acc[method] = (acc[method] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Filtros y Resumen */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Resumen de Pagos</h2>
          <div className="flex gap-2">
            <button
              onClick={() => router.refresh()}
              className="text-sm text-blue-600 hover:underline"
            >
              Refrescar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium">Desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Hasta</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border p-2 rounded"
            />
          </div>
          <button
            onClick={handleFilter}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Filtrar
          </button>
          <button
            onClick={openNewPayment}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-auto"
          >
            + Nuevo Pago
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm text-gray-500">Total Período</p>
            <p className="text-xl font-bold">{formatCurrencyCLP(totalAmount)}</p>
          </div>
          {Object.entries(totalByMethod).map(([method, amount]) => (
            <div key={method} className="bg-gray-50 p-3 rounded border">
              <p className="text-sm text-gray-500 capitalize">{method}</p>
              <p className="text-lg font-semibold">{formatCurrencyCLP(amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">Fecha</th>
              <th className="p-3">Monto</th>
              <th className="p-3">Método</th>
              <th className="p-3">Doc</th>
              <th className="p-3">ID Reserva</th>
              <th className="p-3">Notas</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{payment.payment_date}</td>
                <td className="p-3 font-medium">{formatCurrencyCLP(payment.amount)}</td>
                <td className="p-3 capitalize">{payment.method}</td>
                <td className="p-3">
                  <span className="capitalize">{payment.document_type}</span>
                  {payment.document_number && <span className="text-xs text-gray-500 block">#{payment.document_number}</span>}
                </td>
                <td className="p-3 text-sm text-gray-600">
                  {payment.reservation_id ? `#${payment.reservation_id}` : "-"}
                </td>
                <td className="p-3 text-sm text-gray-500">{payment.notes}</td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => openEditPayment(payment)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(payment.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <div className="p-8 text-center text-gray-500">No hay pagos registrados en este período.</div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingPayment ? "Editar Pago" : "Nuevo Pago"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Monto *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full border p-2 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Método *</label>
                  <select
                    value={formMethod}
                    onChange={e => setFormMethod(e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="webpay">Webpay</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Tipo Doc *</label>
                  <select
                    value={formDocumentType}
                    onChange={e => setFormDocumentType(e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    <option value="boleta">Boleta</option>
                    <option value="factura">Factura</option>
                    <option value="guia">Guía</option>
                    <option value="ninguno">Ninguno</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">N° Documento</label>
                <input
                  type="text"
                  value={formDocumentNumber}
                  onChange={e => setFormDocumentNumber(e.target.value)}
                  className="w-full border p-2 rounded"
                  placeholder="Ej: 12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Asociar a (IDs Opcionales)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">ID Reserva *</label>
                    <input
                      type="number"
                      required
                      placeholder="Req *"
                      value={formReservationId}
                      onChange={e => setFormReservationId(e.target.value)}
                      className="w-full border p-2 rounded text-sm border-blue-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">ID Huésped</label>
                    <input
                      type="number"
                      placeholder="Opcional"
                      value={formGuestId}
                      onChange={e => setFormGuestId(e.target.value)}
                      className="w-full border p-2 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">ID Empresa</label>
                    <input
                      type="number"
                      placeholder="Opcional"
                      value={formCompanyId}
                      onChange={e => setFormCompanyId(e.target.value)}
                      className="w-full border p-2 rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Notas</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full border p-2 rounded h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
