"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    startOfMonth,
    endOfMonth,
    addDays,
} from "date-fns";
import {
    CalendarData,
    CalendarReservation,
    CalendarRoom,
} from "@/lib/data/calendar";
import CalendarHeader from "./CalendarHeader";
import ReservationFormModal from "@/components/reservations/ReservationFormModal";
import { HostalRoom, Guest, Reservation } from "@/types/hostal";
import { useRouter } from "next/navigation";
import CalendarMonthView from "./CalendarMonthView";
import CalendarTimelineView from "./CalendarTimelineView";

type Props = {
    initialData: CalendarData;
    masterRooms: HostalRoom[];
    masterGuests: Guest[];
};

export default function CalendarWrapper({
    initialData,
    masterRooms,
    masterGuests,
}: Props) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");

    // Filters
    const [filters, setFilters] = useState({ status: "all", roomType: "all" });

    // Data State
    const [data, setData] = useState<CalendarData>(initialData);
    console.log(`[CalendarWrapper] State Rooms: ${data.rooms.length}`);
    const [loading, setLoading] = useState(false);

    // Master Data (Client-side cache for modal)
    const [guests, setGuests] = useState<Guest[]>(masterGuests);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalReservation, setModalReservation] = useState<Reservation | null>(
        null
    );
    const [modalInitialData, setModalInitialData] = useState<{
        checkIn?: string;
        checkOut?: string;
        roomId?: number;
    }>({});

    // 🔹 Tipos de habitación dinámicos (desde la BD real)
    const roomTypeOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    masterRooms
                        .map((r: any) => r.room_type as string | null)
                        .filter((rt): rt is string => !!rt)
                )
            ),
        [masterRooms]
    );

    // Date Range Calculation
    const getRange = useCallback(() => {
        let start, end;
        // Month view needs full month range
        if (viewMode === "month") {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        } else if (viewMode === "week") {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        } else {
            // Day view: just today
            start = currentDate;
            end = currentDate;
        }
        return { start, end, days: eachDayOfInterval({ start, end }) };
    }, [currentDate, viewMode]);

    const { start, end, days } = getRange();

    const fetchData = async () => {
        setLoading(true);
        try {
            const fromStr = format(start, "yyyy-MM-dd");
            const toStr = format(end, "yyyy-MM-dd");

            // Build Query Params
            const params = new URLSearchParams({
                from: fromStr,
                to: toStr,
            });
            if (filters.status && filters.status !== "all")
                params.append("status", filters.status);
            if (filters.roomType && filters.roomType !== "all")
                params.append("room_type", filters.roomType);

            const res = await fetch(`/api/calendar?${params.toString()}`);
            const json = await res.json();
            if (json.ok) {
                setData(json.data);
            } else {
                console.error(json.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentDate, viewMode, filters]);

    // --- INTERACTIONS ---

    const handleReservationClick = (res: CalendarReservation) => {
        const fullRes: any = { ...res };
        setModalReservation(fullRes);
        setModalInitialData({});
        setIsModalOpen(true);
    };

    const handleEmptyClick = (date: Date, roomId: number) => {
        const checkIn = format(date, "yyyy-MM-dd");
        const checkOut = format(addDays(date, 1), "yyyy-MM-dd");

        setModalReservation(null);
        setModalInitialData({
            roomId,
            checkIn,
            checkOut,
        });
        setIsModalOpen(true);
    };

    const handleEmptyClickRoom = (room: CalendarRoom, date: Date) => {
        handleEmptyClick(date, room.id);
    };

    const handleModalSuccess = () => {
        fetchData();
        router.refresh();
    };

    const handleGuestUpdate = (newGuest: Guest) => {
        setGuests((prev) =>
            [...prev, newGuest].sort((a, b) => a.full_name.localeCompare(b.full_name))
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-white border rounded-xl shadow-2xl relative">
            <CalendarHeader
                currentDate={currentDate}
                viewMode={viewMode}
                onDateChange={setCurrentDate}
                onViewModeChange={setViewMode}
                onFilterChange={setFilters}
                loading={loading}
                roomTypes={roomTypeOptions}
            />

            <div className="flex-1 relative min-h-0 overflow-hidden flex flex-col">
                {viewMode === "month" ? (
                    <CalendarMonthView
                        currentDate={currentDate}
                        rooms={data.rooms}
                        reservations={data.reservations}
                        onReservationClick={handleReservationClick}
                        onEmptyClick={handleEmptyClick}
                    />
                ) : (
                    <CalendarTimelineView
                        data={data}
                        days={days}
                        viewMode={viewMode}
                        start={start}
                        end={end}
                        onReservationClick={handleReservationClick}
                        onEmptyClick={handleEmptyClickRoom}
                    />
                )}
            </div>

            {/* MODAL */}
            <ReservationFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                reservationToEdit={modalReservation}
                initialData={modalInitialData}
                rooms={masterRooms}
                guests={guests}
                onGuestsUpdate={handleGuestUpdate}
            />
        </div>
    );
}
