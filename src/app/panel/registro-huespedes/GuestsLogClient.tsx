"use client";

import { useState, useMemo, useEffect } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Download, Calendar, User, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LogEntry = {
    id: string; // unique key
    reservation_id: number;
    room_name: string;
    check_in: string;
    check_out: string;
    full_name: string;
    document_id: string;
    type: "Titular" | "Acompañante";
    source: string;
    status: string;
};

export default function GuestsLogClient() {
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFrom, setDateFrom] = useState(format(startOfDay(new Date()), "yyyy-MM-dd"));
    const [dateTo, setDateTo] = useState(format(endOfDay(new Date()), "yyyy-MM-dd"));

    // Fetch Data
    useEffect(() => {
        const fetchLog = async () => {
            setLoading(true);
            const supabase = createClient();

            // Fetch reservations that overlap or start in range? Usually "Check-ins in range" or "Active in range"
            // Let's fetch strict date check-ins for the log book usually implies "Arrivals" or "In House".
            // User asked for "Guest Log". Let's fetch based on Check-in date for now as default log view.

            const { data, error } = await supabase
                .from("hostal_reservations")
                .select(`
                    id, check_in, check_out, status, notes, source,
                    hostal_rooms (name),
                    hostal_guests (full_name, document_id)
                `)
                .gte("check_in", dateFrom)
                .lte("check_in", dateTo)
                .order("check_in", { ascending: false });

            if (error) {
                console.error(error);
                setLoading(false);
                return;
            }

            const parsedEntries: LogEntry[] = [];

            data.forEach((res: any) => {
                // 1. Main Guest
                parsedEntries.push({
                    id: `${res.id}-main`,
                    reservation_id: res.id,
                    room_name: res.hostal_rooms?.name || "N/A",
                    check_in: res.check_in,
                    check_out: res.check_out,
                    full_name: res.hostal_guests?.full_name || "Sin Nombre",
                    document_id: res.hostal_guests?.document_id || "",
                    type: "Titular",
                    source: res.source || "Manual",
                    status: res.status
                });

                // 2. Parsed Companions from Notes
                if (res.notes && res.notes.includes("[COMPANIONS_JSON]")) {
                    try {
                        const start = res.notes.indexOf("[COMPANIONS_JSON]");
                        const end = res.notes.indexOf("[/COMPANIONS_JSON]");
                        if (start !== -1 && end !== -1) {
                            const jsonStr = res.notes.substring(start + "[COMPANIONS_JSON]".length, end);
                            const companions = JSON.parse(jsonStr);
                            if (Array.isArray(companions)) {
                                companions.forEach((c: any, idx: number) => {
                                    parsedEntries.push({
                                        id: `${res.id}-comp-${idx}`,
                                        reservation_id: res.id,
                                        room_name: res.hostal_rooms?.name || "N/A",
                                        check_in: res.check_in,
                                        check_out: res.check_out,
                                        full_name: c.name,
                                        document_id: c.document || "",
                                        type: "Acompañante",
                                        source: res.source || "Manual",
                                        status: res.status
                                    });
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Error parsing companions for res " + res.id, e);
                    }
                }
            });

            setEntries(parsedEntries);
            setLoading(false);
        };

        fetchLog();
    }, [dateFrom, dateTo]);

    // Local Filter
    const filtered = useMemo(() => {
        return entries.filter(e =>
            e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.document_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.room_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [entries, searchTerm]);

    // Export CSV
    const handleExport = () => {
        const headers = ["Reserva ID", "Habitación", "Check-in", "Check-out", "Nombre Completo", "Documento", "Tipo", "Fuente", "Estado"];
        const rows = filtered.map(e => [
            e.reservation_id,
            e.room_name,
            e.check_in,
            e.check_out,
            e.full_name,
            e.document_id,
            e.type,
            e.source,
            e.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `registro_huespedes_${dateFrom}_${dateTo}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* CONTROLS */}
            <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desde</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="w-full border p-2 rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hasta</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="w-full border p-2 rounded-lg"
                    />
                </div>
                <div className="md:col-span-2 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, documento..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full border pl-10 p-2 rounded-lg"
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition"
                    >
                        <Download size={18} /> Exportar
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b">
                            <tr>
                                <th className="px-6 py-3">Huésped</th>
                                <th className="px-6 py-3">Documento</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Habitación</th>
                                <th className="px-6 py-3">Fechas</th>
                                <th className="px-6 py-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Cargando registros...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No se encontraron registros en este rango.</td></tr>
                            ) : (
                                filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-semibold text-gray-900">{item.full_name}</td>
                                        <td className="px-6 py-3 text-gray-600">{item.document_id || "-"}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === 'Titular' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 font-medium">{item.room_name}</td>
                                        <td className="px-6 py-3 text-gray-600">
                                            <div className="flex flex-col text-xs">
                                                <span>In: {item.check_in}</span>
                                                <span>Out: {item.check_out}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-xs px-2 py-1 bg-gray-100 rounded border">{item.status}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t text-xs text-gray-500 flex justify-between">
                    <span>Mostrando {filtered.length} registros</span>
                </div>
            </div>
        </div>
    );
}
