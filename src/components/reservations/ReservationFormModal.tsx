"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    X,
    Calendar,
    User,
    CreditCard,
    CheckCircle,
    AlertCircle,
    FileText,
    Plus,
    Search,
    Trash2,
    Clock,
    FileDown,
    Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Reservation, Guest, HostalRoom } from "@/types/hostal";
import { differenceInDays, parseISO } from "date-fns";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    reservationToEdit?: Reservation | null;
    initialData?: {
        checkIn?: string;
        checkOut?: string;
        roomId?: number;
    };
    rooms: HostalRoom[];
    guests: Guest[];
    onGuestsUpdate?: (newGuest: Guest) => void;
};

// --- HELPER: Companions Parsing ---
const COMPANION_TAG_START = "[COMPANIONS_JSON]";
const COMPANION_TAG_END = "[/COMPANIONS_JSON]";

type Companion = { name: string; document: string };

// --- ICONS ---
const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
    </svg>
);
const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
        />
    </svg>
);

export default function ReservationFormModal({
    isOpen,
    onClose,
    onSuccess,
    reservationToEdit,
    initialData,
    rooms,
    guests,
    onGuestsUpdate,
}: Props) {
    // --- STATE ---
    const [formRoomId, setFormRoomId] = useState("");
    const [formGuestId, setFormGuestId] = useState("");
    const [formGuestSearch, setFormGuestSearch] = useState("");
    const [formCompanyId, setFormCompanyId] = useState("");

    // NEW: Billing Type & Companies
    const [formBillingType, setFormBillingType] = useState("particular");
    const [companies, setCompanies] = useState<any[]>([]);

    // Company Search
    const [companySearch, setCompanySearch] = useState("");
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

    const [formCheckIn, setFormCheckIn] = useState("");
    const [formCheckOut, setFormCheckOut] = useState("");

    const [formStatus, setFormStatus] = useState("pending");
    const [formTotalPrice, setFormTotalPrice] = useState("");
    const [formNotes, setFormNotes] = useState("");

    // Extra fields
    const [formAdults, setFormAdults] = useState(1);
    const [formChildren, setFormChildren] = useState(0);
    const [formSource, setFormSource] = useState("manual");

    // Invoicing / Payment
    const [formInvoiceStatus, setFormInvoiceStatus] = useState("pending");
    const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
    const [formInvoiceNotes, setFormInvoiceNotes] = useState("");
    const [formPaymentMethod, setFormPaymentMethod] = useState("efectivo");

    // Companions
    const [formCompanions, setFormCompanions] = useState<Companion[]>([]);
    const [newCompName, setNewCompName] = useState("");
    const [newCompDoc, setNewCompDoc] = useState("");
    const [formArrivalTime, setFormArrivalTime] = useState("");
    const [formBreakfastTime, setFormBreakfastTime] = useState("");

    // Guest Quick Create Modal
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [newGuestName, setNewGuestName] = useState("");
    const [newGuestEmail, setNewGuestEmail] = useState("");

    // Delete & submit state
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreatingGuest, setIsCreatingGuest] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    // --- COMPUTED ---
    const selectedCompanyData = useMemo(() => {
        if (!formCompanyId) return null;
        return companies.find(c => String(c.id) === String(formCompanyId)) || null;
    }, [companies, formCompanyId]);

    const nights = useMemo(() => {
        if (!formCheckIn || !formCheckOut) return 0;
        const diff = differenceInDays(parseISO(formCheckOut), parseISO(formCheckIn));
        return diff > 0 ? diff : 0;
    }, [formCheckIn, formCheckOut]);

    const filteredGuests = useMemo(() => {
        if (!formGuestSearch) return [];
        const lower = formGuestSearch.toLowerCase();
        return guests
            .filter(
                (g) =>
                    g.full_name.toLowerCase().includes(lower) ||
                    (g.document_id && g.document_id.toLowerCase().includes(lower))
            )
            .slice(0, 5);
    }, [guests, formGuestSearch]);

    const filteredCompanies = useMemo(() => {
        let list = companies;
        if (companySearch) {
            const lower = companySearch.toLowerCase();
            list = companies.filter((c) =>
                c.name.toLowerCase().includes(lower) ||
                (c.rut && c.rut.toLowerCase().includes(lower))
            );
        }
        return list.sort((a: any, b: any) => a.name.localeCompare(b.name));
    }, [companies, companySearch]);

    // --- EFFECT: Load Data ---
    useEffect(() => {
        // Fetch companies
        const loadCompanies = async () => {
            const res = await fetch("/api/companies");
            if (res.ok) {
                const data = await res.json();
                // Filter active companies or show all if editing and the company is inactive?
                // For now, let's just show active ones + the one currently selected if inactive
                setCompanies(data.filter((c: any) => c.is_active));
            }
        };
        loadCompanies();

        if (!isOpen) return;

        if (reservationToEdit) {
            const r: any = reservationToEdit;

            setFormRoomId(String(r.room_id));
            setFormGuestId(String(r.guest_id));

            const foundGuest = guests.find((g) => g.id === r.guest_id);
            const guestName =
                foundGuest?.full_name || r.guest?.full_name || "Huésped Previo";
            setFormGuestSearch(guestName);

            setFormCompanyId(r.company_id ? String(r.company_id) : "");

            // Set initial search name
            if (r.company_id) {
                // Try to find in companies if loaded, otherwise snapshot
                const cId = String(r.company_id);
                const foundC = companies.find(c => String(c.id) === cId);
                setCompanySearch(foundC ? foundC.name : (r.company_name_snapshot || ""));
            } else {
                setCompanySearch("");
            }

            // Set billing type based on explicit field or fall back to company check
            if (r.billing_type) {
                setFormBillingType(r.billing_type);
            } else {
                setFormBillingType(r.company_id ? 'empresa' : 'particular');
            }
            setFormCheckIn(r.check_in);
            setFormCheckOut(r.check_out);
            setFormStatus(r.status);
            setFormTotalPrice(String(r.total_price));

            if (r.companions_json && Array.isArray(r.companions_json)) {
                setFormCompanions(r.companions_json);
                setFormNotes(r.notes || "");
            } else {
                const rawNotes: string = r.notes || "";
                const startIdx = rawNotes.indexOf(COMPANION_TAG_START);
                if (startIdx !== -1) {
                    const cleanNotes = rawNotes.substring(0, startIdx).trim();
                    const jsonPart = rawNotes.substring(
                        startIdx + COMPANION_TAG_START.length,
                        rawNotes.indexOf(COMPANION_TAG_END)
                    );
                    try {
                        const parsed = JSON.parse(jsonPart);
                        setFormCompanions(Array.isArray(parsed) ? parsed : []);
                    } catch (e) {
                        console.error("Error parsing companions", e);
                        setFormCompanions([]);
                    }
                    setFormNotes(cleanNotes);
                } else {
                    setFormNotes(rawNotes);
                    setFormCompanions([]);
                }
            }

            setFormAdults(r.adults || 1);
            setFormChildren(r.children || 0);
            setFormSource(r.source || "manual");

            setFormInvoiceStatus(r.invoice_status || "pending");
            setFormInvoiceNumber(r.invoice_number || "");
            setFormInvoiceNotes(r.invoice_notes || "");

            setFormArrivalTime(r.arrival_time || "");
            setFormBreakfastTime(r.breakfast_time || "");
        } else {
            // NUEVA RESERVA
            setFormRoomId(initialData?.roomId ? String(initialData.roomId) : "");
            setFormCheckIn(
                initialData?.checkIn || new Date().toISOString().split("T")[0]
            );

            if (initialData?.checkOut) {
                setFormCheckOut(initialData.checkOut);
            } else {
                const base = initialData?.checkIn ? new Date(initialData.checkIn) : new Date();
                const next = new Date(base);
                next.setDate(base.getDate() + 1);
                setFormCheckOut(next.toISOString().split("T")[0]);
            }

            setFormGuestId("");
            setFormGuestSearch("");
            setFormCompanyId("");
            setCompanySearch("");
            setFormStatus("pending");
            setFormTotalPrice("");
            setFormNotes("");
            setFormAdults(1);
            setFormChildren(0);
            setFormSource("manual");
            setFormInvoiceStatus("pending");
            setFormInvoiceNumber("");
            setFormInvoiceNotes("");
            setFormPaymentMethod("efectivo");
            setFormCompanions([]);
            setNewCompName("");
            setNewCompDoc("");
            setFormArrivalTime("");
            setFormBreakfastTime("");
        }

        setIsSubmitting(false);
        setIsDeleting(false);
        setIsCreatingGuest(false);
    }, [reservationToEdit, initialData, guests, isOpen]);

    // --- HANDLERS ---
    const selectGuest = (g: Guest) => {
        setFormGuestId(String(g.id));
        setFormGuestSearch(g.full_name);
    };

    const handleAddCompanion = () => {
        if (!newCompName) return;
        setFormCompanions([
            ...formCompanions,
            { name: newCompName, document: newCompDoc },
        ]);
        setNewCompName("");
        setNewCompDoc("");
    };

    const removeCompanion = (idx: number) => {
        setFormCompanions(formCompanions.filter((_, i) => i !== idx));
    };

    const handleCreateGuest = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!newGuestName) {
            toast.error("El nombre del huésped es obligatorio");
            return;
        }

        try {
            setIsCreatingGuest(true);

            const res = await fetch("/api/guests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: newGuestName,
                    email: newGuestEmail,
                    is_active: true,
                }),
            });

            const json = await res.json();
            if (!json.ok) {
                throw new Error(json.error || "Error al crear huésped");
            }

            const newGuest = json.data as Guest;
            if (onGuestsUpdate) onGuestsUpdate(newGuest);

            selectGuest(newGuest);
            setIsGuestModalOpen(false);
            setNewGuestName("");
            setNewGuestEmail("");

            toast.success("Huésped creado y seleccionado correctamente");
        } catch (e: any) {
            toast.error(e.message || "No se pudo crear el huésped");
        } finally {
            setIsCreatingGuest(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formRoomId) {
            toast.error("Debes seleccionar una habitación");
            return;
        }
        if (!formGuestId) {
            toast.error("Debes seleccionar un huésped");
            return;
        }
        if (formCheckOut <= formCheckIn) {
            toast.error("La fecha de salida debe ser posterior a la de entrada");
            return;
        }

        const toastId = toast.loading(
            reservationToEdit ? "Guardando cambios de reserva..." : "Creando reserva..."
        );

        let notesToSend = formNotes || "";

        if (formPaymentMethod && formPaymentMethod !== "efectivo") {
            const paymentNote = `[Pago: ${formPaymentMethod}]`;
            if (!notesToSend) notesToSend = paymentNote;
            else if (!notesToSend.includes("Pago:")) notesToSend += `\n${paymentNote}`;
        }

        const payload: any = {
            room_id: Number(formRoomId),
            guest_id: Number(formGuestId),
            company_id: formCompanyId ? Number(formCompanyId) : null,
            check_in: formCheckIn,
            check_out: formCheckOut,
            status: formStatus,
            total_price: Number(formTotalPrice) || 0,
            notes: notesToSend || null,
            companions_json: formCompanions.length > 0 ? formCompanions : null,
            invoice_status: formInvoiceStatus,
            invoice_number: formInvoiceNumber || null,
            invoice_notes: formInvoiceNotes || null,
            adults: Number(formAdults),
            children: Number(formChildren),
            source: formSource,
            arrival_time: formArrivalTime || null,
            breakfast_time: formBreakfastTime || null,

            // Snapshots
            company_name_snapshot: selectedCompanyData?.name || null,
            billing_type: formBillingType,
            discount_type_snapshot: selectedCompanyData?.discount_type || null,
            discount_value_snapshot: selectedCompanyData?.discount_value || null,
        };

        const rAny: any = reservationToEdit;
        if (
            formInvoiceStatus === "invoiced" &&
            (!reservationToEdit || !rAny.invoice_date)
        ) {
            payload.invoice_date = new Date().toISOString().split("T")[0];
        }

        try {
            setIsSubmitting(true);

            let res: Response;
            if (reservationToEdit) {
                res = await fetch("/api/reservations", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: rAny.id, ...payload }),
                });
            } else {
                res = await fetch("/api/reservations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            const data = await res.json();
            if (!data.ok) {
                throw new Error(data.error || "Error al guardar la reserva");
            }

            toast.success(
                reservationToEdit
                    ? "Reserva actualizada correctamente"
                    : "Reserva creada correctamente",
                { id: toastId }
            );

            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "No se pudo guardar la reserva", {
                id: toastId,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!reservationToEdit) return;

        const rAny: any = reservationToEdit;
        const ok = window.confirm(
            `¿Seguro que deseas eliminar la reserva #${rAny.id}? Esta acción no se puede deshacer.`
        );
        if (!ok) return;

        const toastId = toast.loading("Eliminando reserva...");

        try {
            setIsDeleting(true);
            const res = await fetch(`/api/reservations?id=${rAny.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "Error al eliminar");

            toast.success("Reserva eliminada correctamente", { id: toastId });
            onSuccess();
            onClose();
        } catch (e: any) {
            toast.error(e.message || "Error al eliminar la reserva", { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!reservationToEdit) return;
        const r: any = reservationToEdit;
        const url = `/api/reservations/${r.id}/voucher`;
        window.open(url, "_blank");
        toast.info("Descarga iniciada...");
    };

    const handleSendEmail = async () => {
        if (!reservationToEdit) return;
        const r: any = reservationToEdit;

        // Check for email availability in current guests list first or rely on backend validation
        // We do a quick check if possible, but backend validation is safer
        const guestId = Number(formGuestId);
        const guest = guests.find(g => g.id === guestId);
        if (!guest?.email) {
            toast.error("El huésped seleccionado no tiene un correo registrado. Edítelo para agregar un email.");
            return;
        }

        if (!confirm(`¿Enviar comprobante al correo ${guest.email}?`)) return;

        const toastId = toast.loading("Enviando comprobante...");
        setIsSendingEmail(true);

        try {
            const res = await fetch(`/api/reservations/${r.id}/send-voucher`, { method: "POST" });
            const data = await res.json();

            if (!res.ok || !data.ok) {
                throw new Error(data.error || "Error enviando correo");
            }

            toast.success(`Comprobante enviado a ${guest.email}`, { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Error al enviar correo", { id: toastId });
        } finally {
            setIsSendingEmail(false);
        }
    };

    if (!isOpen) return null;

    // --- RENDER ---
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col">
                {/* HEADER */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            {reservationToEdit ? <EditIcon /> : <PlusIcon />}
                            {reservationToEdit ? "Editar Reserva" : "Nueva Reserva"}
                        </h3>
                        <p className="text-sm text-gray-500">
                            Complete los datos solicitados
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        type="button"
                        disabled={isSubmitting || isDeleting}
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* 1. ESTADÍA */}
                            <section>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">
                                    <Calendar size={16} /> Estadía y Habitación
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700">
                                                Check In *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={formCheckIn}
                                                onChange={(e) => setFormCheckIn(e.target.value)}
                                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700">
                                                Check Out *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={formCheckOut}
                                                onChange={(e) => setFormCheckOut(e.target.value)}
                                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2.5"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">
                                            Habitación *
                                        </label>
                                        <select
                                            value={formRoomId}
                                            onChange={(e) => setFormRoomId(e.target.value)}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2.5 bg-white"
                                            required
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {rooms.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name} - {r.room_type} (Cap: {r.capacity_adults})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">
                                            Adultos
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formAdults}
                                            onChange={(e) => setFormAdults(Number(e.target.value))}
                                            className="w-full border p-2.5 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">
                                            Niños
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formChildren}
                                            onChange={(e) => setFormChildren(Number(e.target.value))}
                                            className="w-full border p-2.5 rounded-lg"
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end">
                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                            {nights} Noches
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {/* 2. TITULAR */}
                            <section className="relative">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">
                                    <User size={16} /> Titular
                                </h4>
                                <div className="grid grid-cols-1 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">
                                            Buscar Huésped *
                                        </label>
                                        <div className="relative">
                                            <Search
                                                className="absolute left-3 top-3 text-gray-400"
                                                size={18}
                                            />
                                            <input
                                                type="text"
                                                value={formGuestSearch || ""}
                                                onChange={(e) => {
                                                    setFormGuestSearch(e.target.value);
                                                    if (!e.target.value) setFormGuestId("");
                                                }}
                                                placeholder="Escriba nombre o documento..."
                                                className={`w-full border rounded-lg shadow-sm pl-10 p-2.5 ${formGuestId
                                                    ? "border-green-500 bg-green-50"
                                                    : "border-gray-300"
                                                    }`}
                                                autoComplete="off"
                                            />
                                            {formGuestSearch &&
                                                !formGuestId &&
                                                filteredGuests.length > 0 && (
                                                    <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl mt-1 z-20 max-h-48 overflow-auto">
                                                        {filteredGuests.map((g) => (
                                                            <div
                                                                key={g.id}
                                                                onClick={() => selectGuest(g)}
                                                                className="p-3 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0 flex justify-between"
                                                            >
                                                                <span className="font-bold">
                                                                    {g.full_name}
                                                                </span>
                                                                <span className="text-gray-500 text-xs">
                                                                    {g.document_id}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                        </div>
                                        <div className="mt-2 text-xs flex justify-between items-center">
                                            <span
                                                className={
                                                    formGuestId
                                                        ? "text-green-600 font-bold flex items-center gap-1"
                                                        : "text-gray-500"
                                                }
                                            >
                                                {formGuestId ? (
                                                    <>
                                                        <CheckCircle size={12} /> Huésped seleccionado
                                                    </>
                                                ) : (
                                                    "Seleccione de la lista o cree uno nuevo"
                                                )}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setIsGuestModalOpen(true)}
                                                className="text-blue-600 font-semibold hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                                            >
                                                <Plus size={14} /> Nuevo Huésped
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* BILLING TYPE & COMPANY */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">Tipo de Cliente</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="billingType"
                                                    value="particular"
                                                    checked={formBillingType === 'particular'}
                                                    onChange={() => {
                                                        setFormBillingType('particular');
                                                        setFormCompanyId("");
                                                    }}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm">Particular</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="billingType"
                                                    value="empresa"
                                                    checked={formBillingType === 'empresa'}
                                                    onChange={() => setFormBillingType('empresa')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm">Empresa / Convenio</span>
                                            </label>
                                        </div>
                                    </div>

                                    {formBillingType === 'empresa' && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label className="block text-sm font-medium mb-1 text-gray-700">
                                                Seleccionar Empresa
                                            </label>
                                            <div className="relative">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                                    <input
                                                        type="text"
                                                        value={companySearch}
                                                        onChange={(e) => {
                                                            setCompanySearch(e.target.value);
                                                            setIsCompanyDropdownOpen(true);
                                                            if (!e.target.value) setFormCompanyId("");
                                                        }}
                                                        onFocus={() => setIsCompanyDropdownOpen(true)}
                                                        placeholder="Buscar empresa..."
                                                        className={`w-full border rounded-lg shadow-sm pl-10 p-2.5 ${formCompanyId ? "border-blue-500 bg-blue-50" : "border-gray-300"
                                                            }`}
                                                    />
                                                    {formCompanyId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFormCompanyId("");
                                                                setCompanySearch("");
                                                            }}
                                                            className="absolute right-2 top-2.5 p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Quitar empresa"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                {isCompanyDropdownOpen && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setIsCompanyDropdownOpen(false)}
                                                        ></div>
                                                        <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl mt-1 z-20 max-h-60 overflow-auto">
                                                            {filteredCompanies.length > 0 ? (
                                                                filteredCompanies.map((c: any) => (
                                                                    <div
                                                                        key={c.id}
                                                                        onClick={() => {
                                                                            setFormCompanyId(String(c.id));
                                                                            setCompanySearch(c.name);
                                                                            setIsCompanyDropdownOpen(false);
                                                                        }}
                                                                        className="p-3 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0 flex justify-between items-center"
                                                                    >
                                                                        <span className="font-medium">{c.name}</span>
                                                                        {c.id == formCompanyId && (
                                                                            <CheckCircle size={14} className="text-blue-600" />
                                                                        )}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="p-4 text-center text-gray-500 text-sm">
                                                                    No se encontraron empresas
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {selectedCompanyData && (
                                                <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                                                    <strong>Convenio:</strong>{' '}
                                                    {selectedCompanyData.discount_type === 'porcentaje'
                                                        ? `${selectedCompanyData.discount_value}% de descuento`
                                                        : selectedCompanyData.discount_type === 'monto_fijo'
                                                            ? `$${selectedCompanyData.discount_value} de descuento`
                                                            : 'Sin descuento especial'
                                                    }
                                                    {selectedCompanyData.credit_days > 0 && ` • Crédito: ${selectedCompanyData.credit_days} días`}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* HORARIOS */}
                            <section>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">
                                    <Clock size={16} /> Horarios (Opcional)
                                </h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">
                                            Hora de Llegada
                                        </label>
                                        <input
                                            type="time"
                                            value={formArrivalTime}
                                            onChange={(e) => setFormArrivalTime(e.target.value)}
                                            className="w-full border p-2.5 rounded-lg border-gray-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">
                                            Hora Desayuno
                                        </label>
                                        <input
                                            type="time"
                                            value={formBreakfastTime}
                                            onChange={(e) => setFormBreakfastTime(e.target.value)}
                                            className="w-full border p-2.5 rounded-lg border-gray-300"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* ACOMPAÑANTES */}
                            <section>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">
                                    <User size={16} /> Acompañantes
                                </h4>
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <div className="space-y-3 mb-4">
                                        {formCompanions.map((c, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between bg-white p-2 rounded shadow-sm border text-sm"
                                            >
                                                <div>
                                                    <span className="font-bold">{c.name}</span>
                                                    {c.document && (
                                                        <span className="text-gray-500 ml-2">
                                                            ({c.document})
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeCompanion(idx)}
                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {formCompanions.length === 0 && (
                                            <p className="text-sm text-gray-400 italic text-center py-2">
                                                Sin acompañantes registrados
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium mb-1 text-gray-600">
                                                Nombre Completo
                                            </label>
                                            <input
                                                type="text"
                                                value={newCompName}
                                                onChange={(e) => setNewCompName(e.target.value)}
                                                className="w-full border p-2 rounded text-sm"
                                                placeholder="Nombre del acompañante"
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <label className="block text-xs font-medium mb-1 text-gray-600">
                                                Documento
                                            </label>
                                            <input
                                                type="text"
                                                value={newCompDoc}
                                                onChange={(e) => setNewCompDoc(e.target.value)}
                                                className="w-full border p-2 rounded text-sm"
                                                placeholder="DNI / Pasaporte"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddCompanion}
                                            className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200 font-bold text-sm"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* DETALLES */}
                            <section>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">
                                    <FileText size={16} /> Detalles
                                </h4>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">
                                        Notas Internas
                                    </label>
                                    <textarea
                                        value={formNotes}
                                        onChange={(e) => setFormNotes(e.target.value)}
                                        className="w-full border border-gray-300 p-2.5 rounded-lg h-24 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Preferencias, nombres de acompañantes, etc..."
                                    />
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="lg:col-span-4 space-y-6 bg-gray-50 p-6 rounded-xl border h-fit">
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                                    <AlertCircle size={16} /> Estado
                                </h4>
                                <select
                                    value={formStatus}
                                    onChange={(e) => setFormStatus(e.target.value)}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg font-medium text-gray-700 mb-3"
                                >
                                    <option value="pending">🟡 Pendiente</option>
                                    <option value="confirmed">🟢 Confirmada</option>
                                    <option value="checked_in">🔵 Check-in</option>
                                    <option value="checked_out">⚫ Check-out</option>
                                    <option value="cancelled">🔴 Cancelada</option>
                                    <option value="blocked">🚫 Bloqueada</option>
                                </select>

                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    Fuente
                                </label>
                                <select
                                    value={formSource}
                                    onChange={(e) => setFormSource(e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded text-sm"
                                >
                                    <option value="manual">Mostrador / Teléfono</option>
                                    <option value="booking">Booking.com</option>
                                    <option value="airbnb">Airbnb</option>
                                    <option value="expedia">Expedia</option>
                                    <option value="web">Web Propia</option>
                                </select>
                            </div>

                            <hr className="border-gray-200" />

                            <div>
                                <h4 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                                    <CreditCard size={16} /> Pago
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-1">
                                            Total (CLP)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={formTotalPrice}
                                            onChange={(e) => setFormTotalPrice(e.target.value)}
                                            className="w-full border-blue-200 ring-2 ring-blue-50 p-2.5 rounded-lg text-lg font-bold text-right text-blue-800"
                                            placeholder="$ 0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                            Forma de Pago
                                        </label>
                                        <select
                                            value={formPaymentMethod}
                                            onChange={(e) => setFormPaymentMethod(e.target.value)}
                                            className="w-full border p-2 rounded text-sm"
                                        >
                                            <option value="efectivo">Efectivo</option>
                                            <option value="tarjeta">Tarjeta (Crédito/Débito)</option>
                                            <option value="transferencia">Transferencia</option>
                                            <option value="pendiente">Pendiente</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                            Facturación
                                        </label>
                                        <select
                                            value={formInvoiceStatus}
                                            onChange={(e) => setFormInvoiceStatus(e.target.value)}
                                            className="w-full border p-2 rounded text-sm"
                                        >
                                            <option value="pending">Pendiente de Doc.</option>
                                            <option value="invoiced">Factura / Boleta Emitida</option>
                                            <option value="partial">Abono Parcial</option>
                                        </select>
                                    </div>

                                    {formInvoiceStatus !== "pending" && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                Nº Documento
                                            </label>
                                            <input
                                                type="text"
                                                value={formInvoiceNumber}
                                                onChange={(e) => setFormInvoiceNumber(e.target.value)}
                                                className="w-full border p-2 rounded text-sm"
                                                placeholder="Ej: 123456"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-between items-center sticky bottom-0 z-10">
                        <div className="text-sm text-gray-500 flex items-center gap-3">
                            {reservationToEdit ? (
                                <>
                                    <span>
                                        Reserva <b>#{(reservationToEdit as any).id}</b>
                                    </span>
                                </>
                            ) : (
                                "Creando nueva reserva"
                            )}
                        </div>
                        <div className="flex gap-3 items-center">
                            {reservationToEdit && (
                                <>
                                    <div className="flex mr-2 gap-2 border-r pr-4">
                                        <button
                                            type="button"
                                            onClick={handleDownloadPdf}
                                            disabled={isSubmitting || isDeleting || isSendingEmail}
                                            className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm disabled:opacity-50"
                                            title="Descargar Comprobante PDF"
                                        >
                                            <FileDown size={18} />
                                            <span className="hidden xl:inline">PDF</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSendEmail}
                                            disabled={isSubmitting || isDeleting || isSendingEmail}
                                            className="p-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-2 text-sm disabled:opacity-50"
                                            title="Enviar Comprobante por Correo"
                                        >
                                            <Mail size={18} />
                                            <span className="hidden xl:inline">{isSendingEmail ? "Enviando..." : "Email"}</span>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={isDeleting || isSubmitting || isSendingEmail}
                                        className="px-3 py-2.5 border border-red-500 text-red-600 font-semibold rounded-lg hover:bg-red-50 text-sm flex items-center gap-2 disabled:opacity-60"
                                        title="Eliminar Reserva"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting || isDeleting || isSendingEmail}
                                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors text-sm disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || isDeleting}
                                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg transition-transform active:scale-95 text-sm disabled:opacity-60"
                            >
                                {isSubmitting
                                    ? reservationToEdit
                                        ? "Guardando..."
                                        : "Creando..."
                                    : reservationToEdit
                                        ? "Guardar Cambios"
                                        : "Crear Reserva"}
                            </button>
                        </div>
                    </div>
                </form >
            </div >

            {/* QUICK CREATE GUEST SUB-MODAL */}
            {
                isGuestModalOpen && (
                    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm border-2 border-blue-100">
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <User size={20} /> Nuevo Huésped
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Nombre Completo *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                        value={newGuestName}
                                        onChange={(e) => setNewGuestName(e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Email (Opcional)
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full border p-2.5 rounded-lg"
                                        value={newGuestEmail}
                                        onChange={(e) => setNewGuestEmail(e.target.value)}
                                        placeholder="juan@email.com"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        onClick={() => setIsGuestModalOpen(false)}
                                        type="button"
                                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                                        disabled={isCreatingGuest}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateGuest}
                                        type="button"
                                        disabled={isCreatingGuest}
                                        className="px-4 py-1.5 text-sm bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-60"
                                    >
                                        {isCreatingGuest ? "Creando..." : "Crear y Usar"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
