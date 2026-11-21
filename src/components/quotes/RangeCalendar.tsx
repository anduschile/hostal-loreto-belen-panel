"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Calendario de rango: 1er clic = entrada, 2º clic = salida. */
export default function RangeCalendar({
    start, end, onChange,
}: { start: string; end: string; onChange: (start: string, end: string) => void }) {
    const base = start ? new Date(start + "T00:00:00") : new Date();
    const [year, setYear] = useState(base.getFullYear());
    const [month, setMonth] = useState(base.getMonth());

    const first = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
    const total = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

    const pick = (d: number) => {
        const v = iso(year, month, d);
        if (!start || end || v <= start) onChange(v, "");
        else onChange(start, v);
    };
    const shift = (n: number) => {
        const d = new Date(year, month + n, 1);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
    };

    return (
        <div className="w-72 rounded-lg border border-slate-200 bg-white p-3 select-none">
            <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => shift(-1)} className="p-1 rounded hover:bg-slate-100"><ChevronLeft size={16} /></button>
                <span className="text-sm font-semibold text-slate-700">{MONTHS[month]} {year}</span>
                <button type="button" onClick={() => shift(1)} className="p-1 rounded hover:bg-slate-100"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-slate-400 mb-1">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
                {cells.map((d, i) => {
                    if (!d) return <span key={i} />;
                    const v = iso(year, month, d);
                    const isEdge = v === start || v === end;
                    const inRange = start && end && v > start && v < end;
                    return (
                        <button
                            type="button"
                            key={i}
                            onClick={() => pick(d)}
                            className={`py-1.5 rounded ${isEdge ? "bg-emerald-600 text-white font-semibold" : inRange ? "bg-emerald-100 text-emerald-800" : "hover:bg-slate-100 text-slate-700"}`}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
