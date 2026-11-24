"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatDateDMY } from "@/lib/quotes/calc";
import { makeIso, monthGrid, monthTitle, nextRangeSelection, parseIso, shiftMonth, todayIso, type RangeMode } from "@/lib/quotes/dateShortcuts";

const WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

/**
 * Campo de fechas con calendario de rango de dos meses (uno solo en pantallas angostas).
 * 1er clic = inicio, 2º clic = fin (se cierra solo), 3er clic = selección nueva.
 * El calendario se dibuja en un portal con posición fija calculada desde el campo, para que el modal no lo recorte.
 */
export default function DateRangeField({
    start, end, mode, onChange,
}: { start: string; end: string; mode: RangeMode; onChange: (start: string, end: string) => void }) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState(() => ({ y: 2000, m: 1 }));
    const [two, setTwo] = useState(true);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);

    const label = start ? `${formatDateDMY(start)} → ${end ? formatDateDMY(end) : "…"}` : "Elige las fechas";

    const openCalendar = () => {
        const p = parseIso(start) ?? parseIso(todayIso())!;
        setView({ y: p.y, m: p.m });
        setOpen(true);
    };

    // 1 mes en pantallas de menos de 640 px
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 640px)");
        const apply = () => setTwo(mq.matches);
        apply();
        mq.addEventListener("change", apply);
        return () => mq.removeEventListener("change", apply);
    }, []);

    const place = useCallback(() => {
        const b = btnRef.current, p = popRef.current;
        if (!b || !p) return;
        const r = b.getBoundingClientRect();
        const w = p.offsetWidth, h = p.offsetHeight;
        const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
        let top = r.bottom + 4;
        if (top + h > window.innerHeight - 8 && r.top - h - 4 >= 8) top = r.top - h - 4; // no cabe abajo: se abre hacia arriba
        setPos({ left, top: Math.max(8, top) });
    }, []);

    useLayoutEffect(() => { if (open) place(); }, [open, two, view, place]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey, true);
        return () => {
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey, true);
        };
    }, [open, place]);

    const pick = (iso: string) => {
        const next = nextRangeSelection(start, end, iso, mode);
        onChange(next.start, next.end);
        if (next.end) setOpen(false);
    };

    const months = two ? [view, shiftMonth(view.y, view.m, 1)] : [view];
    const hint = mode === "rango" ? "Ahora elige la salida" : "Ahora elige el último día";

    return (
        <div className="inline-block">
            <button ref={btnRef} type="button" onClick={() => (open ? setOpen(false) : openCalendar())} aria-haspopup="dialog" aria-expanded={open}
                className="w-64 flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-md text-sm bg-white hover:bg-slate-50 text-left">
                <span className={start ? "text-slate-800" : "text-slate-400"}>{label}</span>
                <Calendar size={16} className="text-slate-400 shrink-0" />
            </button>
            {open && typeof document !== "undefined" && createPortal(
                <div ref={popRef} role="dialog" aria-label="Elegir fechas" style={{ position: "fixed", left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
                    className="z-[70] max-w-[calc(100vw-16px)] rounded-lg border border-slate-200 bg-white p-3 shadow-xl select-none">
                    <div className="flex items-start gap-3">
                        {months.map((mo, idx) => (
                            <div key={`${mo.y}-${mo.m}`} className={`w-64 ${idx > 0 ? "sm:border-l sm:border-slate-200 sm:pl-3" : ""}`}>
                                <div className="flex items-center justify-between mb-2 h-7">
                                    {idx === 0 ? <button type="button" onClick={() => setView(shiftMonth(view.y, view.m, -1))} className="p-1 rounded hover:bg-slate-100" aria-label="Mes anterior"><ChevronLeft size={16} /></button> : <span className="w-6" />}
                                    <span className="text-sm font-bold text-slate-700">{monthTitle(mo.y, mo.m)}</span>
                                    {idx === months.length - 1 ? <button type="button" onClick={() => setView(shiftMonth(view.y, view.m, 1))} className="p-1 rounded hover:bg-slate-100" aria-label="Mes siguiente"><ChevronRight size={16} /></button> : <span className="w-6" />}
                                </div>
                                <div className="grid grid-cols-7 text-center text-[10px] font-medium text-slate-400 mb-1">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
                                <div className="grid grid-cols-7 text-center text-sm gap-y-0.5">
                                    {monthGrid(mo.y, mo.m).map((d, i) => {
                                        if (!d) return <span key={i} />;
                                        const v = makeIso(mo.y, mo.m, d);
                                        const isStart = v === start, isEnd = v === end;
                                        const inside = !!start && !!end && v > start && v < end;
                                        const strip = inside ? "bg-emerald-100" : isStart && end && end > start ? "bg-emerald-100 rounded-l-md" : isEnd && start && end > start ? "bg-emerald-100 rounded-r-md" : "";
                                        return (
                                            <div key={i} className={strip}>
                                                <button type="button" onClick={() => pick(v)} aria-pressed={isStart || isEnd}
                                                    className={`w-full h-8 rounded-md ${isStart || isEnd ? "bg-emerald-700 text-white font-semibold" : inside ? "text-emerald-900" : "text-slate-700 hover:bg-slate-100"}`}>{d}</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">{start && !end ? hint : ""}</span>
                        <span className="flex items-center gap-3">
                            {start && <button type="button" onClick={() => onChange("", "")} className="text-emerald-700 hover:underline">Borrar fechas</button>}
                            <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700" aria-label="Cerrar"><X size={14} /> Cerrar</button>
                        </span>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
