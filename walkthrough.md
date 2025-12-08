# Solución: Flujo de Reservas Unificado

Se han realizado los ajustes solicitados para corregir el bug de pérdida de datos y alinear el frontend con el backend.

## 1. Ajustes en `ReservationFormModal`
- **Inicialización de Datos**: Ahora el formulario carga correctamente los datos de `companions_json` si existen, con fallback a `notes` para reservas antiguas.
- **Búsqueda de Huésped**: Si el huésped de la reserva no está en la lista cargada (ej. paginación), se usa el nombre que viene en el objeto reserva (`guest.full_name`) para mostrarlo en el input, evitando que aparezca vacío.
- **Envío de Datos (`onSubmit`)**:
    - Se eliminó la lógica que "empaquetaba" los acompañantes dentro del campo de texto `notes`.
    - Ahora se envían como un campo separado: `companions_json`.
    - `notes` se mantiene limpio para texto libre.

## 2. Campos en Base de Datos (`hostal_reservations`)
Se aseguró que la capa de datos (`src/lib/data/reservations.ts`) y el validador (`Zod`) permitan y guarden los siguientes campos CRÍTICOS que antes se borraban:
- `guest_id` (CRÍTICO: antes se borraba explícitamente)
- `total_price` (CRÍTICO: antes se borraba explícitamente)
- `notes` (CRÍTICO: antes se borraba explícitamente)
- `adults`
- `children`
- `source`
- `companions_json` (Nuevo campo soportado y persistido)
- `code`

## 3. Visualización en Calendario
- La función `getCalendarData` (y `getReservations`, `getDaybook`) ahora realiza un **LEFT JOIN explícito** con `hostal_guests`.
- El campo `guest_name` se popula automáticamente con `hostal_guests.full_name` directamente desde la base de datos.
- Esto garantiza que el calendario muestre el nombre del huésped incluso si no se ha cargado la lista completa de huéspedes en el frontend.
- Se incluye `companions_json` en la respuesta para que el modal lo pueda leer al editar.

## Verificación
- **Build**: `npm run build` ejecutado exitosamente. Sigue el estándar de tipos corregido.

## 4. Refactorización del Calendario (Semana/Día)
- **Orden de Habitaciones**: Se actualizó `getCalendarData` para ordenar por `sort_order` ascendente, luego `id`. Ahora coincide con el orden del select de habitaciones (1 a 12).
- **Visibilidad**: Se eliminó cualquier límite implícito. El nuevo layout muestra todas las habitaciones devueltas por la consulta (12).
- **Alineación y Scroll**:
    - Se refactorizó `CalendarTimelineView` para usar un único contenedor con scroll (`overflow-auto`).
    - La columna de habitaciones (Sidebar) ahora es una columna `sticky left-0` dentro de la tabla principal, lo que garantiza que las filas siempre estén alineadas con el grid.
    - Se eliminó el componente `CalendarSidebar` separado para integrarlo directamente en la estructura de filas del Timeline, asegurando que comparten el mismo `ROW_HEIGHT`.

