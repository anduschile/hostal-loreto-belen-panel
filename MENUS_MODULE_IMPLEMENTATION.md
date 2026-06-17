# Módulo de Gestión de Menús - Informe de Implementación

## 1. Archivos Creados

### Migraciones SQL
- `supabase/migrations/20260617_create_menus_tables.sql` — Crea 4 tablas nuevas (hostal_menus, hostal_menu_prices, hostal_meal_services, hostal_meal_consumption), índices y RLS

### Data Layers (src/lib/data/)
- `menus.ts` — CRUD completo para el catálogo de menús
- `menu-prices.ts` — Gestión de precios por empresa y tipo de servicio, con resolución de precios por prioridad
- `meal-services.ts` — Programación diaria de servicios de comida
- `meal-consumption.ts` — Registro de consumo por huésped, con batch create
- `meal-report.ts` — Queries para reportes filtrados por fecha, empresa

### Validadores Zod (src/lib/validators/)
- `menus.ts` — MenuSchema, MenuUpdateSchema, MenuPriceSchema, MenuPriceUpdateSchema
- `meal-services.ts` — MealServiceSchema, MealServiceUpdateSchema con superRefine para validar menu_a_id ≠ menu_b_id

### Utilidades (src/lib/utils/)
- `whatsapp.ts` — buildWhatsappMessage() construye texto e links wa.me con normalización de teléfono (asume +56 para Chile)
- `excel-export.ts` — exportToExcel() para generación de archivos XLSX

### Storage (src/lib/supabase/)
- `storage.ts` — uploadMenuPhoto(), deleteMenuPhoto() para gestión de fotos en bucket "menu-photos"

### API Routes (src/app/api/)
- `menus/route.ts` — GET (listar, con search) y POST (crear)
- `menus/[id]/route.ts` — GET, PUT, DELETE de menú específico
- `menus/[id]/prices/route.ts` — GET precios del menú, POST crear precio, PUT editar, DELETE
- `menus/upload-photo/route.ts` — POST upload de foto (validación de tipos y tamaño)
- `meal-services/route.ts` — GET (filtrable por fecha y tipo) y POST (crear)
- `meal-services/[id]/route.ts` — GET, PUT, DELETE de servicio específico
- `meal-services/[id]/consumption/route.ts` — GET listado de huéspedes, POST autoload con query a reservas activas
- `meal-consumption/[id]/route.ts` — PUT para actualizar elección, con resolución automática de precio
- `reports/meal-services/route.ts` — GET reporte filtrable por fecha, empresa, tipo servicio
- `reports/meal-services/export/route.ts` — GET preparación de datos para exportación Excel

### Componentes (src/components/)
- `menus/MenuFormModal.tsx` — Modal CRUD de menús (edit/create) con upload de foto
- `menus/MenuPriceManager.tsx` — Gestor de precios inline en el modal de menú
- `menus/MealServiceModal.tsx` — Modal para programar servicios del día (selecciona menú A y B)
- `menus/MealConsumptionTable.tsx` — Tabla interactiva de huéspedes con botones A/B, WhatsApp, estado
- `menus/WhatsappPreviewModal.tsx` — Preview del mensaje antes de enviar (abre wa.me al confirmar)
- `reports/MealServiceReport.tsx` — Componente de reporte con filtros, tabla y exportación Excel

### Páginas (src/app/(panel)/)
- `menus/page.tsx` — Página principal con dos tabs: "Catálogo" (CRUD de menús + precios) y "Programación" (CRUD de servicios)
- `menus/programar/page.tsx` — Vista dedicada para gestionar un servicio puntual (autoload de huéspedes, tabla de consumo)

## 2. Archivos Modificados

### Tipos (src/types/hostal.ts)
Agregados:
- `HostalMenu`, `MenuInsert`
- `MenuPrice`, `MenuPriceInsert`
- `MealService`, `MealServiceInsert`
- `MealChoiceType`, `MealWhatsappStatus`
- `MealConsumption`, `MealConsumptionInsert`

### Sidebar (src/components/layout/Sidebar.tsx)
- Importado `UtensilsCrossed` de lucide-react
- Agregado item `{ label: "Menús", href: "/panel/menus", icon: UtensilsCrossed }` entre Pagos y Reportes

### Reportes (src/app/panel/reportes/ReportsClient.tsx)
- Importado `MealServiceReport`
- Agregado estado `activeTab: "general" | "meals"`
- Agregadas dos pestañas: "General" y "Servicios de Comida"
- Tab de comidas monta el componente `<MealServiceReport />`

### Package.json
- Agregada dependencia `"xlsx": "^0.18.5"` (SheetJS)

## 3. Migraciones SQL Aplicadas

La migración crea:
1. **hostal_menus**: Catálogo de platos con foto, ingredientes, descripción
2. **hostal_menu_prices**: Precios por empresa/tipo_servicio/vigente_desde (UNIQUE constraint en combinación)
3. **hostal_meal_services**: Programación diaria (UNIQUE en fecha+tipo_servicio, CHECK menu_a_id ≠ menu_b_id)
4. **hostal_meal_consumption**: Consumo por huésped (UNIQUE en meal_service_id+guest_id)

RLS habilitado con política "Enable all for admins and reception" en las 4 tablas.

Índices creados en: fecha, meal_service_id, guest_id, y lookup de precios.

## 4. Dependencias Nuevas en package.json

- **xlsx** (^0.18.5) — Para exportación a Excel

## 5. Pasos Manuales a Realizar

### A. Supabase Console
1. **Ejecutar migración SQL**: Copiar contenido de `supabase/migrations/20260617_create_menus_tables.sql` e ir a Supabase Studio → SQL Editor → ejecutar
2. **Crear bucket de Storage**:
   - Nombre: `menu-photos`
   - Visibilidad: Public (lectura abierta)
   - Restricciones: MIME types: `image/jpeg, image/png, image/webp`
   - Tamaño máximo: 5 MB
   - Configurar RLS si es necesario (permitir uploads solo a usuarios autenticados)

### B. Variables de Entorno
No se requieren variables nuevas de entorno (Storage bucket se referencia por nombre en el código).

### C. Instalar dependencias
```bash
npm install
```
(Ya realizado, xlsx está en package.json)

## 6. Decisiones Técnicas Anotadas

1. **Resolución de precio en la PUT de consumo**: Cuando el usuario marca la elección (A o B), el endpoint resuelve el precio automáticamente buscando primero en (menu_id, company_id, tipo_servicio) y fallback a público (company_id IS NULL). Si no encuentra precio, guarda precio_snapshot=0 con nota "Precio no configurado, requiere revisión".

2. **Autoload de huéspedes**: Al navegar a /menus/programar?serviceId=X, si no hay consumos registrados, se ejecuta automáticamente un POST a /consumption con action="autoload" que busca reservas con status IN ('confirmed', 'checked_in') para esa fecha y crea consumos.

3. **WhatsApp message builder**: Helper normaliza teléfono (quita espacios, guiones, paréntesis, +) y asume +56 (Chile) si no tiene código país. Plantilla es Markdown básico (bold con *texto*), soporta URLs de fotos en el cuerpo del mensaje.

4. **Storage público**: Bucket "menu-photos" es público de lectura, permite URLs directas. Solo usuarios autenticados pueden subir (controlado por RLS si se configura).

5. **Sin paginación en listas**: Las tablas de menús, servicios y consumo cargan sin paginación (asuming data sets moderados). Si crece, agregar paginación / virtualization después.

6. **Reporte de comidas**: Tabla de datos bruta + totales. Exportación a Excel genera dos hojas (Comidas detallado + Resumen por empresa). El resumen agrupa por empresa y tipo de servicio.

7. **Acceso**: Item "Menús" en sidebar visible para roles "superadmin" y "recepcion" (por RLS de las tablas). No hay validación adicional en frontend, la DB rechazará si el usuario no tiene permisos.

## 7. Cosas Detectadas para Después (No Implementadas)

1. **Foto en WhatsApp message**: El helper construye URLs directas pero no hay validación de que la foto esté realmente disponible. Si la foto se borra pero el menú aún existe, el link será válido pero apuntará a archivo inexistente.

2. **Sincronización de company_id en consumo**: El consumo guarda company_id como snapshot al crear, pero si se edita la reserva y cambia la empresa, el consumo sigue con la empresa original. Para un cambio después, agregar opción de "re-snapshot" si se detecta cambio.

3. **Validación de huéspedes sin teléfono**: El botón WhatsApp deshabilitado si no hay teléfono, pero el usuario puede verlo deshabilitado sin saber por qué. Agregar tooltip o mensaje de error claro.

4. **Exportación de Excel en el cliente**: Por ahora la exportación usa XLSX en el browser. Si crece el volumen, migrar a server-side con streaming.

5. **Auditoría**: No hay logs de quién cambió qué en menús/precios. Si se requiere, agregar campos created_by/updated_by + trigger de auditoría.

## 8. Cómo Probar el Módulo End-to-End

### Paso 1: Crear menús en el catálogo
1. Ir a `/panel/menus`
2. Tab "Catálogo"
3. Click "+ Nuevo Menú"
4. Llenar nombre (obligatorio), descripción, ingredientes
5. Subir 3 fotos (JPG/PNG/WebP, max 5MB)
6. Guardar
7. Repetir para 3 menús diferentes (ej: Pasta, Pollo, Ensalada)

### Paso 2: Configurar precios
1. En el catálogo, click "Precios" en un menú
2. Agregar precio para Multiexport, almuerzo, $15.000, vigente desde hoy
3. Agregar precio para Multiexport, cena, $12.000
4. Agregar precio público (sin empresa), almuerzo, $20.000
5. Guardar
6. Repetir para los otros 2 menús

### Paso 3: Programar un servicio
1. Tab "Programación"
2. Click "+ Programar Servicio"
3. Fecha: mañana
4. Tipo: Cena
5. Menú A: Pasta
6. Menú B: Pollo
7. Guardar
8. Aparecerá en la tabla, click "Gestionar"

### Paso 4: Autoload y envío WhatsApp
1. En /menus/programar?serviceId=X, debería cargar automáticamente huéspedes con reserva activa
2. Click en "WhatsApp" para un huésped
3. Ver preview del mensaje con los menús, fechas, nombres
4. Click "Enviar WhatsApp" → abre wa.me en nueva pestaña
5. Verificar que el mensaje tiene las opciones A y B con nombres y fotos

### Paso 5: Marcar elecciones
1. En la tabla de consumo, click botones "A" o "B" para marcar elección
2. Verificar que el precio se llena automáticamente ($15.000 para Multiexport cena)
3. Probar con un huésped sin empresa (particular) → debe resolver precio público

### Paso 6: Reportes
1. Ir a `/panel/reportes`
2. Tab "Servicios de Comida"
3. Filtros: desde hoy, hasta mañana, empresa: Multiexport
4. Click "Generar Reporte"
5. Ver tabla con columnas: Fecha, Huésped, Empresa, Tipo Servicio, Menú Servido, Precio
6. Totales al pie
7. Click "Exportar Excel"
8. Descargar y abrir en Excel
9. Verificar 2 hojas: "Comidas" (detalles) y "Resumen" (agregado por empresa)

### Paso 7: Casos Edge
- Marcar elección en un huésped sin teléfono → no debe poder enviarse WhatsApp
- Crear menú A y B idénticos → debe validar error "deben ser diferentes"
- Intentar editar/borrar un menú con precios configurados → debería permitir (FK no restringe delete a hostal_menus, solo es CASCADE en hostal_menu_prices)
- Exportar Excel sin datos → debería mostrar tabla vacía o mensaje

## 9. Notas Finales

- El código sigue el patrón existente del proyecto (data layers → validators → API routes → componentes → páginas)
- Sin refactorización del código existente
- Sin cambios a TypeScript strict, tests, o ReservationFormModal
- Las features están limitadas al alcance del prompt (sin bonus features)
- RLS habilitado para restricción de acceso a nivel de DB
- Todos los endpoints y componentes son funcionales pero pueden requerir ajustes de UI/UX según feedback real
