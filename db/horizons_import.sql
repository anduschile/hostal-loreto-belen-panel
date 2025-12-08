-- ==============================================================================
-- 1. TABLAS DE IMPORTACIÓN (STAGING)
-- Ejecutar esto primero para preparar el terreno.
-- ==============================================================================

create table if not exists public.horizons_rooms_import (
  id           uuid default gen_random_uuid(),
  number       integer,
  type         text,
  capacity     integer,
  status       text,
  description  text,
  created_at   timestamptz default now()
);

create table if not exists public.horizons_reservations_import (
  id             uuid default gen_random_uuid(),
  room_number    integer, -- Usamos room_number para enlazar si el ID no coincide
  guest_name     text,
  check_in       date,
  check_out      date,
  guests         integer,
  status         text,
  arrival_time   text,
  breakfast_time text,
  source         text,
  payment_method text,
  institution    text,
  observations   text,
  code           text,
  created_at     timestamptz default now()
);

-- ==============================================================================
-- 2. MIGRACIÓN A PRODUCCIÓN
-- Ejecutar DESPUÉS de cargar los CSV en las tablas de importación.
-- ==============================================================================

-- 2.1. INSERTAR HABITACIONES
-- Se asume matching por 'number'. Se ignoran duplicados.

INSERT INTO public.hostal_rooms (code, name, room_type, capacity_adults, capacity_children, status, notes)
SELECT 
    CAST(number AS text) as code,        -- Usamos el número como código
    'Habitación ' || number as name,     -- Nombre descriptivo
    COALESCE(type, 'Estándar') as room_type,
    COALESCE(capacity, 2) as capacity_adults,
    0 as capacity_children,              -- Default 0
    COALESCE(status, 'disponible') as status,
    description as notes
FROM public.horizons_rooms_import
ON CONFLICT (code) DO NOTHING; -- Asumiendo que 'code' es unique en hostal_rooms, verifique constraints.
-- Si la constraint es por otro campo, ajustar. Normalmente 'code' o 'name' son únicos.
-- Si no hay constraint unique formal, esto podría duplicar.


-- 2.2. INSERTAR HUÉSPEDES
-- Extraer nombres únicos de las reservas importadas que no existan ya.

INSERT INTO public.hostal_guests (full_name, is_active)
SELECT DISTINCT 
    trim(guest_name) as full_name, 
    true as is_active
FROM public.horizons_reservations_import
WHERE trim(guest_name) IS NOT NULL 
  AND trim(guest_name) != ''
  AND NOT EXISTS (
      SELECT 1 FROM public.hostal_guests g WHERE g.full_name = trim(horizons_reservations_import.guest_name)
  );


-- 2.3. INSERTAR RESERVAS
-- Mapear Habitaciones y Huéspedes para insertar llaves foráneas correctas.

INSERT INTO public.hostal_reservations (
    room_id,
    guest_id,
    check_in,
    check_out,
    status,
    total_price,
    adults,
    children,
    notes,
    source,
    invoice_status
)
SELECT 
    r.id as room_id,
    g.id as guest_id,
    i.check_in,
    i.check_out,
    -- Mapeo de estados (Ajustar según valores reales de Horizons)
    CASE 
        WHEN lower(i.status) LIKE '%confirm%' THEN 'confirmed'
        WHEN lower(i.status) LIKE '%check-in%' THEN 'checked_in'
        WHEN lower(i.status) LIKE '%check-out%' THEN 'checked_out'
        WHEN lower(i.status) LIKE '%anulada%' THEN 'cancelled'
        ELSE 'pending' 
    END as status,
    0 as total_price, -- Precio no viene claro, default 0
    COALESCE(i.guests, 1) as adults,
    0 as children,
    CONCAT(
        i.observations, 
        CASE WHEN i.code IS NOT NULL THEN ' | Code Legacy: ' || i.code ELSE '' END,
        CASE WHEN i.institution IS NOT NULL THEN ' | Institución: ' || i.institution ELSE '' END,
        CASE WHEN i.payment_method IS NOT NULL THEN ' | Pago: ' || i.payment_method ELSE '' END
    ) as notes,
    COALESCE(i.source, 'manual') as source,
    'pending' as invoice_status
FROM public.horizons_reservations_import i
LEFT JOIN public.hostal_rooms r ON r.code = CAST(i.room_number AS text) -- Cruce por número de habitación
LEFT JOIN public.hostal_guests g ON g.full_name = trim(i.guest_name)    -- Cruce por nombre exacto
WHERE r.id IS NOT NULL AND g.id IS NOT NULL; -- Solo insertar si encontramos match de habitación y huésped

-- FIN DE MIGRACIÓN
