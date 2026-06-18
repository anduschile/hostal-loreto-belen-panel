// src/types/hostal.ts

// ---- HABITACIONES ----
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

// ---- EMPRESAS ----
export interface Company {
  id: number;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  credit_days: number;
  discount_type: 'porcentaje' | 'monto_fijo' | 'ninguno';
  discount_value: number;
  precio_preferencial?: number;
  precio_normal?: number;
  created_at: string;
  updated_at: string;
}

// ---- HUÉSPEDES ----
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

// ---- HOUSEKEEPING / LIMPIEZA ----
export type HousekeepingStatus =
  | "sucia"
  | "en_limpieza"
  | "lista"
  | "mantenimiento";

export interface HousekeepingEntry {
  id: number;
  room_id: number;
  date: string; // YYYY-MM-DD
  status: HousekeepingStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod =
  | "efectivo"
  | "transferencia"
  | "tarjeta"
  | "webpay"
  | "otro";

export type DocumentType =
  | "boleta"
  | "factura"
  | "guia"
  | "ninguno";

export interface Payment {
  id: number;
  reservation_id: number;
  amount: number;
  currency: string;
  method: PaymentMethod;
  document_type: DocumentType;
  document_number?: string | null;
  payment_date: string; // YYYY-MM-DD
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "blocked";

export interface Reservation {
  id: number;
  room_id: number;
  guest_id: number;
  company_id?: number | null;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  status: ReservationStatus;
  total_price: number;
  notes?: string | null;
  invoice_number?: string | null;
  invoice_status: "pending" | "invoiced" | "partial";
  invoice_date?: string | null;
  invoice_notes?: string | null;
  adults: number;
  children: number;
  source: string;
  code: string;
  companions_json?: any | null; // JSONB null
  arrival_time?: string | null;
  breakfast_time?: string | null;

  // Snapshots
  company_name_snapshot?: string | null;
  billing_type: string; // 'particular' | 'empresa'
  discount_type_snapshot?: string | null;
  discount_value_snapshot?: number | null;
  credit_days_snapshot?: number | null;

  created_at: string;
  updated_at: string;
}

export interface ReservationInsert {
  room_id: number;
  guest_id: number;
  company_id?: number | null;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  total_price: number;
  notes?: string | null;
  invoice_number?: string | null;
  invoice_status?: "pending" | "invoiced" | "partial"; // Opcional al crear, default en DB
  invoice_date?: string | null;
  invoice_notes?: string | null;
  adults?: number;
  children?: number;
  source?: string;
  code?: string;
  companions_json?: any | null;
  arrival_time?: string | null;
  breakfast_time?: string | null;

  // Snapshots
  company_name_snapshot?: string | null;
  billing_type?: string;
  discount_type_snapshot?: string | null;
  discount_value_snapshot?: number | null;
  credit_days_snapshot?: number | null;
}

export interface RoomInsert {
  code: string;
  name: string;
  room_type: string;
  annex?: string | null;
  floor?: number | null;
  status: RoomStatus;
  capacity_adults: number;
  capacity_children: number;
  default_rate?: number | null;
  currency: string;
  notes?: string | null;
}

export interface GuestInsert {
  full_name: string;
  document_id?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface PaymentInsert {
  reservation_id?: number | null;
  guest_id?: number | null;
  company_id?: number | null;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  document_type: DocumentType;
  document_number?: string | null;
  payment_date: string; // YYYY-MM-DD
  notes?: string | null;
}

// ---- MENÚS ----
export interface HostalMenu {
  id: number;
  nombre: string;
  descripcion?: string | null;
  foto_url?: string | null;
  ingredientes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuInsert {
  nombre: string;
  descripcion?: string | null;
  foto_url?: string | null;
  ingredientes?: string | null;
  is_active?: boolean;
}

// ---- PRECIOS DE MENÚ ----
export interface MenuPrice {
  id: number;
  menu_id: number;
  company_id?: number | null;
  tipo_servicio: "almuerzo" | "cena";
  precio: number;
  vigente_desde: string; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuPriceInsert {
  menu_id: number;
  company_id?: number | null;
  tipo_servicio: "almuerzo" | "cena";
  precio: number;
  vigente_desde?: string; // YYYY-MM-DD, defaults to today
  is_active?: boolean;
}

// ---- SERVICIOS DE COMIDA ----
export interface MealService {
  id: number;
  fecha: string; // YYYY-MM-DD
  tipo_servicio: "almuerzo" | "cena";
  menu_a_id: number;
  menu_b_id: number;
  notas?: string | null;
  created_by?: number | null;
  tipo_precio?: "preferencial" | "normal";
  created_at: string;
  updated_at: string;
}

export interface MealServiceInsert {
  fecha: string; // YYYY-MM-DD
  tipo_servicio: "almuerzo" | "cena";
  menu_a_id: number;
  menu_b_id: number;
  notas?: string | null;
  created_by?: number | null;
  tipo_precio?: "preferencial" | "normal";
}

// ---- CONSUMO DE COMIDA ----
export type MealChoiceType = "A" | "B";
export type MealWhatsappStatus = "pendiente" | "enviado" | "respondido" | "sin_respuesta";

export interface MealConsumption {
  id: number;
  meal_service_id: number;
  guest_id: number;
  reservation_id?: number | null;
  company_id?: number | null;
  eleccion?: MealChoiceType | null;
  estado_whatsapp: MealWhatsappStatus;
  estado_servicio: "activo" | "anulado";
  whatsapp_enviado_at?: string | null;
  precio_snapshot?: number | null;
  menu_servido_id?: number | null;
  notas?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealConsumptionInsert {
  meal_service_id: number;
  guest_id: number;
  reservation_id?: number | null;
  company_id?: number | null;
  eleccion?: MealChoiceType | null;
  estado_whatsapp?: MealWhatsappStatus;
  estado_servicio?: "activo" | "anulado";
  whatsapp_enviado_at?: string | null;
  precio_snapshot?: number | null;
  menu_servido_id?: number | null;
  notas?: string | null;
}
