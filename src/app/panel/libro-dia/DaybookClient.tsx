"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DaybookEntry } from "@/lib/data/daybook";
import { HostalRoom, Guest } from "@/types/hostal";
import { formatCurrencyCLP, formatDateCL } from "@/lib/formatters";
import ReservationFormModal from "@/components/reservations/ReservationFormModal";
import { Edit, Calendar, BedDouble, Users, AlertCircle, CheckCircle, FileText } from "lucide-react";

type Props = {
    initialDate: string;
    initialEntries: DaybookEntry[];
    rooms: HostalRoom[];
    guests: Guest[];
};

export default function DaybookClient({ initialDate, initialEntries, rooms, guests }: Props) {
    const router = useRouter();
    const [date, setDate] = useState(initialDate);
    const [entries, setEntries] = useState<DaybookEntry[]>(initialEntries);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [tempInvoiceNumber, setTempInvoiceNumber] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalReservation, setModalReservation] = useState<any>(null);

    useEffect(() => {
        setEntries(initialEntries);
        setDate(initialDate);
    }, [initialEntries, initialDate]);

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        router.replace(`/panel/libro-dia?date=${newDate}`);
    };

    // KPIs Logic
    const occupiedRooms = entries.length;
    // Assuming 1 guest per reservation if fields missing, but usually we'd sum adults+children if available.
    // For now, count entries as proxy for "Groups/Rooms".
    const pendingInvoices = entries.filter(e => e.invoice_status === "pending").length;
    const totalPotential = entries.reduce((acc, curr) => acc + curr.total_price, 0);

    // --- QUICK INVOICE EDIT ---
    const startEdit = (entry: DaybookEntry) => {
        setEditingId(entry.id);
        setTempInvoiceNumber(entry.invoice_number || "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setTempInvoiceNumber("");
    };

    const handleSaveInvoice = (id: number) => {
        const entry = entries.find(e => e.id === id);
        if (entry) {
            handleInvoiceUpdate(entry, undefined, tempInvoiceNumber);
            setEditingId(null);
        }
    };

    const handleInvoiceUpdate = async (
        entry: DaybookEntry,
        newStatus?: "pending" | "invoiced" | "partial",
        newNumber?: string
    ) => {
        try {
            const payload: any = { reservationId: entry.id };
            if (newStatus) payload.invoice_status = newStatus;
            if (newNumber !== undefined) payload.invoice_number = newNumber;
            if (newStatus === "invoiced" && !entry.invoice_date) {
                payload.invoice_date = new Date().toISOString().split('T')[0];
            }

            const res = await fetch("/api/daybook", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Error al actualizar facturación");

            // Optimistic update
            const updated = { ...entry, ...payload };
            if (newStatus) updated.invoice_status = newStatus;
            if (newNumber !== undefined) updated.invoice_number = newNumber;

            setEntries(prev => prev.map(e => e.id === entry.id ? updated : e));
            router.refresh();

        } catch (error: any) {
            alert(error.message);
        }
    };

    // --- SHARED MODAL ---
    const openFullEdit = (entry: DaybookEntry) => {
        setModalReservation(entry);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        router.refresh();
        setIsModalOpen(false);
    };

    const handleGuestUpdate = (g: Guest) => {
        // Optional: If we want to add new guest to local list
    };

    // Helpers
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "invoiced":
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} /> Facturada</span>;
            case "partial":
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertCircle size={12} /> Parcial</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><AlertCircle size={12} /> Pendiente</span>;
        }
    };

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Libro del Día</h1>
                    <p className="text-sm text-gray-500">Gestión operativa diaria y facturación</p>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-lg border">
                    <Calendar className="text-gray-400 ml-2" size={20} />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700"
                    />
                    <div className="h-6 w-px bg-gray-300 mx-1"></div>
                    <button
                        onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
                        className="text-xs font-bold text-blue-600 hover:bg-white px-3 py-1.5 rounded-md transition-shadow uppercase"
                    >
                        Hoy
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Habitaciones Ocupadas</p>
                        <p className="text-3xl font-extrabold text-gray-900">{occupiedRooms}</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <BedDouble size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Por Facturar</p>
                        <p className="text-3xl font-extrabold text-gray-900">{pendingInvoices}</p>
                    </div>
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                        <FileText size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-500 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total del Día (Est)</p>
                        <p className="text-2xl font-extrabold text-gray-900">{formatCurrencyCLP(totalPotential)}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Users size={24} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500">
                                <th className="p-4 font-semibold">Habitación</th>
                                <th className="p-4 font-semibold">Huésped Principal</th>
                                <th className="p-4 font-semibold">Fechas</th>
                                <th className="p-4 font-semibold">Total</th>
                                <th className="p-4 font-semibold">Estado Factura</th>
                                <th className="p-4 font-semibold">N° Documento</th>
                                <th className="p-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{entry.room_name}</div>
                                        <div className="text-xs text-gray-500">{entry.room_type}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-gray-800">{entry.guest_name}</div>
                                        {entry.company_name && (
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                🏢 {entry.company_name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col text-xs text-gray-600">
                                            <span><span className="font-semibold w-8 inline-block">IN:</span> {formatDateCL(entry.check_in)}</span>
                                            <span><span className="font-semibold w-8 inline-block">OUT:</span> {formatDateCL(entry.check_out)}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-gray-900">
                                        {formatCurrencyCLP(entry.total_price)}
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(entry.invoice_status)}
                                    </td>
                                    <td className="p-4">
                                        {editingId === entry.id ? (
                                            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95">
                                                <input
                                                    type="text"
                                                    value={tempInvoiceNumber}
                                                    onChange={(e) => setTempInvoiceNumber(e.target.value)}
                                                    className="border border-blue-300 rounded px-2 py-1 w-24 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    placeholder="12345"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSaveInvoice(entry.id)} className="bg-green-500 text-white p-1 rounded hover:bg-green-600 shadow-sm"><CheckCircle size={14} /></button>
                                                <button onClick={cancelEdit} className="bg-gray-200 text-gray-600 p-1 rounded hover:bg-gray-300"><AlertCircle size={14} /></button>
                                            </div>
                                        ) : (
                                            <div className="group/edit flex items-center gap-2">
                                                <span className={`font-mono ${!entry.invoice_number ? "text-gray-400 italic text-xs" : "text-gray-700"}`}>
                                                    {entry.invoice_number || "Sin N°"}
                                                </span>
                                                <button
                                                    onClick={() => startEdit(entry)}
                                                    className="opacity-0 group-hover/edit:opacity-100 text-blue-600 hover:text-blue-800 transition-opacity p-1 bg-blue-50 rounded"
                                                    title="Editar Número"
                                                >
                                                    <Edit size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {entry.invoice_status !== "invoiced" && (
                                                <button
                                                    onClick={() => handleInvoiceUpdate(entry, "invoiced")}
                                                    className="inline-flex items-center gap-1 bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-50 hover:border-green-300 transition-colors shadow-sm"
                                                    title="Marcar como Facturada"
                                                >
                                                    <CheckCircle size={14} /> Facturar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openFullEdit(entry)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                title="Ver detalle completo"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {entries.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Calendar size={48} className="text-gray-300" />
                                            <p className="font-medium">No hay reservas activas para esta fecha.</p>
                                            <p className="text-xs">Usa el calendario para crear nuevas reservas.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SHARED MODAL */}
            <ReservationFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                reservationToEdit={modalReservation}
                rooms={rooms}
                guests={guests}
                onGuestsUpdate={handleGuestUpdate}
            />
        </div>
    );
}
