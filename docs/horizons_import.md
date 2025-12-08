# Importación de Datos desde Horizons (Excel Legacy)

Esta guía explica cómo importar datos históricos desde el sistema antiguo Horizons usando archivos CSV y Supabase.

## 1. Preparar Archivos CSV
Debes convertir tus hojas de Excel a dos archivos CSV (codificación UTF-8):

1.  `horizons_rooms.csv`: Datos de habitaciones.
2.  `horizons_reservations.csv`: Datos de reservas históricas.

### Formato Esperado

**Habitaciones (`horizons_rooms_import`)**:
- `number` (Entero, obligatorio)
- `type` (Texto)
- `capacity` (Entero)
- `status` (Texto)
- `description` (Texto)

**Reservas (`horizons_reservations_import`)**:
- `room_id` (UUID o Nulo - *Nota: El script de importación enlazará por número de habitación si es necesario, pero idealmente mapear el ID*)
- `guest_name` (Texto) -> Se usará para crear huéspedes únicos.
- `check_in` (Fecha YYYY-MM-DD)
- `check_out` (Fecha YYYY-MM-DD)
- `guests` (Entero)
- `status` (Texto: Confirmed, Check-in, etc.)
- `source` (Texto)
- `payment_method` (Texto)
- `institution` (Texto)
- `observations` (Texto)
- `code` (Texto)

## 2. Crear Tablas de Importación
Ejecuta la **Primera Sección** del script `db/horizons_import.sql` en el Editor SQL de Supabase para crear las tablas temporales:

- `public.horizons_rooms_import`
- `public.horizons_reservations_import`

## 3. Cargar Datos (CSV)
1.  Ve a **Table Editor** en Supabase.
2.  Selecciona `horizons_rooms_import`.
3.  Click en "Insert" -> "Import Data from CSV".
4.  Sube `horizons_rooms.csv`.
5.  Repite para `horizons_reservations_import`.

## 4. Migrar a Producción
Una vez cargados los datos en las tablas de importación, ejecuta la **Segunda Sección** del script `db/horizons_import.sql`.

Este script realizará lo siguiente:
1.  **Habitaciones**: Insertará nuevas habitaciones en `hostal_rooms` (omitiendo duplicados por número).
2.  **Huéspedes**: Creará registros únicos en `hostal_guests` basados en `guest_name`.
3.  **Reservas**: Insertará las reservas en `hostal_reservations`, enlazando automáticamente con el ID de la habitación (por número) y el ID del huésped (por nombre).

> **Nota**: Este proceso NO borra datos existentes.
