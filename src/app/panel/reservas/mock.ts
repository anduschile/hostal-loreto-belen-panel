export const mockRooms = [
  { id: 1, name: "Habitación 1" },
  { id: 2, name: "Habitación 2" },
  { id: 3, name: "Habitación 3" },
];

export const mockReservations = [
  {
    id: 101,
    roomId: 1,
    start: "2025-12-05",
    end: "2025-12-08",
    status: "confirmed",
  },
  {
    id: 102,
    roomId: 2,
    start: "2025-12-10",
    end: "2025-12-12",
    status: "cancelled",
  },
  {
    id: 103,
    roomId: 3,
    start: "2025-12-15",
    end: "2025-12-20",
    status: "checkin",
  },
];
