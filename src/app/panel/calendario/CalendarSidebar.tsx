"use client";

import { CalendarRoom } from "@/lib/data/calendar";
import { User, BedDouble, Users } from "lucide-react"; // Assuming lucide-react is available, common in shadcn/next stacks. 
// If not available, I will use text/emoji or svg. Since I can't be 100% sure, I'll use SVGs directly to be safe and "Professional".

type Props = {
    rooms: CalendarRoom[];
    rowHeight: number;
};

// Icons (Simple SVGs)
const IconPerson = () => (
    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
);

const IconBed = () => (
    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M2 12V6a2 2 0 012-2h16a2 2 0 012 2v6h-2v7h-2v-4H6v4H4v-7H2zm2-4h8v3H4V8zm10 0h6v3h-6V8z" />
    </svg>
);

export default function CalendarSidebar({ rooms, rowHeight }: Props) {
    return (
        <div className="bg-white border-r shadow-lg z-10 sticky left-0 min-w-[200px] max-w-[250px]">
            {/* Header cell matching the date header height (approx) */}
            <div className="h-[89px] border-b bg-gray-50 flex items-center justify-center font-bold text-gray-500 uppercase text-xs tracking-wider">
                Habitaciones
            </div>

            {/* Rooms List */}
            <div className="divide-y">
                {rooms.map((room) => (
                    <div
                        key={room.id}
                        className="flex flex-col justify-center px-4 hover:bg-gray-50 transition-colors bg-white relative"
                        style={{ height: rowHeight }}
                    >
                        <div className="font-bold text-sm text-gray-800">{room.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {room.type}
                            </span>
                            <div className="flex items-center gap-0.5 ml-auto" title={`Capacidad: ${room.capacity}`}>
                                <IconPerson />
                                <span className="text-xs text-gray-500">{room.capacity}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
