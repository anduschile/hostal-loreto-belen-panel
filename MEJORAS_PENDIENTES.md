# Mejoras Pendientes — Sistema Hostal Loreto Belén

**Última actualización:** 17 de junio 2026
**Contexto:** Consolidado de hallazgos durante la implementación del módulo de Gestión de Menús (alojamiento + comida para empresas convenio, caso inicial: Multiexport).

---

## 1. Pendientes específicos del módulo de Menús

Cambios chicos, acotados, sobre funcionalidad que ya existe y funciona.

- [ ] **Agregar huésped manual.** Hoy la tabla de gestión de un servicio solo se llena vía autoload/sincronización desde reservas confirmadas. Falta un control (autocomplete sobre `hostal_guests`) para sumar a alguien que no tiene reserva asociada o que se necesita agregar fuera de ese flujo. Estimado por Claude Code: cambio chico (UI + endpoint simple, reusa patrón de `createMealConsumption`).
- [ ] **Formato visual del Excel exportado.** Funciona y trae los datos correctos, pero el formato es básico. Mejorar presentación (anchos de columna, encabezados con estilo, formato de moneda) para que sea más profesional al enviarlo a Multiexport.

---

## 2. Deuda técnica heredada del sistema (no introducida por el módulo de Menús, pero detectada durante el trabajo)

- [ ] **TypeScript en modo `strict: false`** y `ignoreBuildErrors: true` en `tsconfig.json` / `next.config.ts`. Migrar a `strict: true` de forma incremental (`noImplicitAny` → `strictNullChecks` → resto), no de golpe.
- [ ] **`ReservationFormModal.tsx` de 88 KB en un solo archivo.** Componente monolítico, difícil de mantener. Candidato a refactor en subcomponentes.
- [ ] **Sin tests** (unitarios ni E2E) en todo el proyecto. Mínimo viable: tests E2E con Playwright para flujos críticos (crear reserva, check-in, facturación, flujo de menús).
- [ ] **Políticas RLS completamente abiertas** (`USING true`) en todo el sistema, incluidas las 4+ tablas nuevas del módulo de menús. Cualquier usuario autenticado puede hacer cualquier operación sobre cualquier tabla. Para datos sensibles (huéspedes, pagos), debería filtrarse por rol real vía `hostal_users.supabase_user_id` (UUID, comparable con `auth.uid()`).
- [ ] **14 vulnerabilidades reportadas por `npm audit`** (1 low, 7 moderate, 6 high). Revisar caso por caso, no aplicar `npm audit fix --force` ciegamente — algunas pueden requerir actualizar paquetes principales (Next.js, React) que necesitan testing posterior.
- [ ] **Inconsistencia de formato en `/api/companies`.** Devuelve un array plano (`[...]`) mientras el resto del sistema usa `{ ok, data }`. Esto causó el mismo bug en 3 componentes distintos durante este módulo (`MenuPriceManager`, `MealConsumptionTable`, `MealServiceReport`). Evaluar estandarizar el endpoint, midiendo antes el impacto en componentes existentes que ya lo consumen como array plano.
- [ ] **Estructura de carpetas confusa.** Tres niveles de anidación para llegar al proyecto real: `Loreto Belen > App-Hostal > hostal-app`. Considerar aplanar o renombrar para mayor claridad.
- [ ] **Carpeta huérfana `src/app/(panel)/`.** Route group abandonado de una versión anterior del proyecto. Contiene páginas viejas sin uso aparente: `auditoria`, `dashboard`, `habitaciones`, `housekeeping`, `pagos`, `reservas`, `usuarios`. Confirmar que están realmente muertas (no referenciadas desde ningún lado) antes de borrar toda la carpeta. La estructura real y activa del panel vive en `src/app/panel/` (sin paréntesis).

---

## 3. Lección de proceso para trabajar con Claude Code

Durante esta implementación, varios bugs tardaron más de lo necesario en resolverse porque Claude Code **asumió** nombres de variables o estructuras de código en vez de **verificarlos leyendo el archivo real** antes de escribir (ejemplos: nombre del parámetro `id` en una ruta API, contenido real de una política RLS existente, ubicación real de la carpeta de rutas del panel). 

Regla a aplicar en próximos prompts: pedir explícitamente que Claude Code **lea y cite las líneas reales** de cualquier código que vaya a replicar o de cuyo comportamiento dependa, antes de escribir su propia versión — no asumir por el nombre o por convención típica.

---

## 4. Visión futura / posibles nuevos proyectos

Ideas con valor real, pero que NO son mejoras chicas sobre el módulo actual — son decisiones de hacia dónde crece el producto. No tienen alcance ni fecha definida; requieren definición de reglas o son proyectos aparte antes de convertirse en un prompt de implementación.

### 4.1. Alerta de repetición de menú

Inspirado en un proyecto anterior ("Tíos", gestión de comida para casino de prestador de servicios). Idea: que el sistema avise cuando un mismo plato (o categoría de plato) se ofrece con demasiada frecuencia, ya sea:
- A un mismo turno/grupo en una ventana de tiempo (ej. "ya van 3 veces con pollo esta semana, máximo permitido: 2").
- A una misma persona específica en patrones repetidos (ej. "a Fernando se le ha ofrecido salmón los últimos 2 domingos seguidos").

**Antes de convertir esto en un prompt de implementación, hay que decidir con calma:**
- ¿La ventana de conteo es semana calendario o últimos N días móviles?
- ¿Se cuenta por plato exacto o por categoría/ingrediente principal (para que "Cazuela de vacuno" y "Vacuno a la pimienta" cuenten como "lo mismo")?
- ¿La regla aplica por turno colectivo, por persona individual, o ambas (son lógicas de conteo distintas)?
- ¿El límite es fijo en el sistema o configurable por plato/categoría?

Tamaño estimado: mediano. No es un simple agregado, requiere modelo de datos y reglas de negocio bien definidas primero.

### 4.2. Gestión de ingredientes, costos e inventario

Sistema de recetas (ingredientes y cantidades por menú) + costos unitarios + control de stock. Permitiría saber el costo real de cada plato y llevar inventario de cocina.

**Esto es un proyecto nuevo y separado, no una mejora del módulo de menús actual.** Incluye: tabla de ingredientes (unidad, costo, proveedor), receta por menú, control de entradas/salidas de stock, posibles alertas de quiebre.

Encaja como una propuesta comercial nueva para Loreto Belén (sistema de gestión a medida, con valor de venta claro: "sabes cuánto te cuesta cada plato, controlas tu stock"), a evaluar cuando el módulo de menús actual lleve un tiempo operando y el cliente vea valor en seguir invirtiendo.

---

*Este documento se actualiza manualmente. Revisar y depurar cada vez que se cierre una ronda de mejoras.*
