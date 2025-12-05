// src/types/hostal.ts

export type RoomStatus =
  | "disponible"
  | "ocupada"
  | "mantenimiento"
  | "limpieza"
  | "fuera_servicio";

export interface HostalRoom {
  id: number;
  code: string;
  name: string;
  room_type: string;
  annex: string | null;
  floor: number | null;
  status: RoomStatus;
  capacity_adults: number;
  capacity_children: number;
  default_rate: number | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Company ya alineado con el módulo de Empresas
export interface Company {
  id: number;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  created_at: string;
  updated_at: string;
}

// Nuevo: Guest, usado en el módulo de huéspedes
export interface Guest {
  id: number;
  full_name: string;
  document_id?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
