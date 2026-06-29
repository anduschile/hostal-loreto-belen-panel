# Mejoras Pendientes — Sistema Hostal Loreto Belén

**Última actualización:** 28 de junio 2026
**Contexto:** Consolidado de hallazgos durante la implementación del módulo de Gestión de Menús (alojamiento + comida para empresas convenio, caso inicial: Multiexport).

---

## 1. Pendientes específicos del módulo de Menús

Cambios chicos, acotados, sobre funcionalidad que ya existe y funciona.

- [ ] **Mejorar la variante visual del mensaje de error al borrar un menú en uso.** Cuando se intenta borrar un menú referenciado en servicios o consumos, el sistema correctamente lo rechaza con un mensaje claro ("Está siendo usado en X servicios y Y registros de consumo"), pero visualmente se muestra con el ícono de "error interno" (rojo, alerta) en vez de una notificación más neutra de advertencia. Es un rechazo esperado de validación de negocio, no una falla del sistema — el estilo debería reflejar eso. Cosmético, no urgente.

---

## 2. Comportamientos verificados como correctos (no son bugs, documentar para no re-investigar)

- ✅ **Snapshot histórico de menú servido.** Si se edita el menú A/B de un servicio después de que algún huésped ya tiene su elección confirmada, el registro de consumo de ese huésped mantiene el plato que efectivamente se le asignó en su momento (`menu_servido_id`), no el que quedó configurado después en el servicio. Esto es intencional: preserva la trazabilidad real de qué se sirvió a cada persona, necesaria para facturación e historial. Verificado en sesión del 19 de junio al intentar borrar un menú que ya no estaba en ninguna programación activa pero sí en consumos históricos.
- ✅ **Política de cobro en anulaciones (decisión de negocio confirmada con Fernando, 19 de junio):** si una reserva confirmada se cae **antes** de la fecha del servicio, el registro de consumo se **elimina por completo** (botón "Quitar") — no genera costo, no aparece en ningún reporte. Si una reserva confirmada **no se presenta a último momento** (la comida ya se preparó), se cobra igual, como un consumo normal, **sin ninguna marca especial** de "anulado" — es indistinguible de cualquier otro consumo en el reporte. El concepto de "estado_servicio" (anulado/activo) que se implementó brevemente fue removido por no corresponder a este modelo de negocio real.

---

## 3. Deuda técnica heredada del sistema (no introducida por el módulo de Menús, pero detectada durante el trabajo)

- [ ] **TypeScript en modo `strict: false`** y `ignoreBuildErrors: true` en `tsconfig.json` / `next.config.ts`. Migrar a `strict: true` de forma incremental (`noImplicitAny` → `strictNullChecks` → resto), no de golpe.
- [ ] **`ReservationFormModal.tsx` de 88 KB en un solo archivo.** Componente monolítico, difícil de mantener. Candidato a refactor en subcomponentes.
- [ ] **Sin tests** (unitarios ni E2E) en todo el proyecto. Mínimo viable: tests E2E con Playwright para flujos críticos (crear reserva, check-in, facturación, flujo de menús).
- [ ] **Políticas RLS completamente abiertas** (`USING true`) en todo el sistema, incluidas las 4+ tablas nuevas del módulo de menús. Cualquier usuario autenticado puede hacer cualquier operación sobre cualquier tabla. Para datos sensibles (huéspedes, pagos), debería filtrarse por rol real vía `hostal_users.supabase_user_id` (UUID, comparable con `auth.uid()`).
- [ ] **14 vulnerabilidades reportadas por `npm audit`** (1 low, 7 moderate, 6 high). Revisar caso por caso, no aplicar `npm audit fix --force` ciegamente — algunas pueden requerir actualizar paquetes principales (Next.js, React) que necesitan testing posterior.
- [ ] **Inconsistencia de formato en `/api/companies`.** Devuelve un array plano (`[...]`) mientras el resto del sistema usa `{ ok, data }`. Esto causó el mismo bug en 3 componentes distintos durante este módulo (`MenuPriceManager`, `MealConsumptionTable`, `MealServiceReport`). Evaluar estandarizar el endpoint, midiendo antes el impacto en componentes existentes que ya lo consumen como array plano.
- [ ] **Estructura de carpetas confusa.** Tres niveles de anidación para llegar al proyecto real: `Loreto Belen > App-Hostal > hostal-app`. Considerar aplanar o renombrar para mayor claridad.
- [ ] **Carpeta huérfana `src/app/(panel)/`.** Route group abandonado de una versión anterior del proyecto. Contiene páginas viejas sin uso aparente: `auditoria`, `dashboard`, `habitaciones`, `housekeeping`, `pagos`, `reservas`, `usuarios`. Confirmar que están realmente muertas (no referenciadas desde ningún lado) antes de borrar toda la carpeta. La estructura real y activa del panel vive en `src/app/panel/` (sin paréntesis).
- [ ] **Texto del mensaje de WhatsApp duplicado en dos archivos.** `src/lib/utils/whatsapp.ts` (la función que genera el mensaje real que se envía) y `src/components/menus/WhatsappPreviewModal.tsx` (el componente que muestra el preview en pantalla) tienen cada uno su propia copia hardcodeada del texto, en vez de que el modal reuse la función del helper. Esto causó que un cambio de nomenclatura (28 de junio: unificar "Opción 1/2" a "Opción A/B") se aplicara solo en uno de los dos archivos en el primer intento, y el preview siguiera mostrando el texto viejo hasta el segundo intento. Recomendado: que `WhatsappPreviewModal.tsx` llame a `buildWhatsappMessage()` de `whatsapp.ts` para construir el texto mostrado, en vez de tener su propia plantilla JSX paralela.

---

## 4. Lección de proceso para trabajar con Claude Code

Durante esta implementación, varios bugs tardaron más de lo necesario en resolverse porque Claude Code **asumió** nombres de variables o estructuras de código en vez de **verificarlos leyendo el archivo real** antes de escribir (ejemplos: nombre del parámetro `id` en una ruta API, contenido real de una política RLS existente, ubicación real de la carpeta de rutas del panel). 

Regla a aplicar en próximos prompts: pedir explícitamente que Claude Code **lea y cite las líneas reales** de cualquier código que vaya a replicar o de cuyo comportamiento dependa, antes de escribir su propia versión — no asumir por el nombre o por convención típica.

**Segundo aprendizaje (sesión 18-19 de junio):** cuando Claude Code agrega `console.error` temporal para diagnosticar un bug, hay que pedirle explícitamente que **lea las líneas reales del scope del catch** antes de escribir la línea de logging — varias rondas se perdieron porque usó nombres de variable inventados (`consumptionId`, luego `id`) que no existían en ese bloque, y el logging mismo explotaba con un error nuevo que tapaba el error real que se quería diagnosticar. Mismo patrón de raíz que el aprendizaje original: verificar antes de escribir, no asumir.

**Tercer aprendizaje:** con Supabase/PostgREST, `.eq("columna", valor)` falla si `valor` es `null` (genera `columna = NULL` en SQL, sintaxis inválida) — hay que usar `.is("columna", null)` para ese caso. Y `.select(..., { count: "exact", head: true })` no devuelve filas en `data` (queda vacío siempre); el conteo real viene en la propiedad `count`, no en `data.length`. Ambos son errores silenciosos fáciles de pasar por alto en review de código porque no son sintácticamente incorrectos, solo producen el resultado equivocado.

**Cuarto aprendizaje (sesión 20 de junio):** un input de búsqueda con `disabled={loading}` pierde el foco cada vez que el fetch de búsqueda se dispara (el navegador desenfoca un input al deshabilitarlo), rompiendo la experiencia de autocomplete por completo — hay que escribir, se pierde el foco, hay que volver a hacer click. El fix es simplemente no deshabilitar el input mientras carga (mostrar el loading de otra forma, ej. un spinner al lado, sin tocar el `disabled` del campo de texto).

---

## 5. Visión futura / posibles nuevos proyectos

Ideas con valor real, pero que NO son mejoras chicas sobre el módulo actual — son decisiones de hacia dónde crece el producto. No tienen alcance ni fecha definida; requieren definición de reglas o son proyectos aparte antes de convertirse en un prompt de implementación.

### 5.1. Alerta de repetición de menú

Inspirado en un proyecto anterior ("Tíos", gestión de comida para casino de prestador de servicios). Idea: que el sistema avise cuando un mismo plato (o categoría de plato) se ofrece con demasiada frecuencia, ya sea:
- A un mismo turno/grupo en una ventana de tiempo (ej. "ya van 3 veces con pollo esta semana, máximo permitido: 2").
- A una misma persona específica en patrones repetidos (ej. "a Fernando se le ha ofrecido salmón los últimos 2 domingos seguidos").

**Antes de convertir esto en un prompt de implementación, hay que decidir con calma:**
- ¿La ventana de conteo es semana calendario o últimos N días móviles?
- ¿Se cuenta por plato exacto o por categoría/ingrediente principal (para que "Cazuela de vacuno" y "Vacuno a la pimienta" cuenten como "lo mismo")?
- ¿La regla aplica por turno colectivo, por persona individual, o ambas (son lógicas de conteo distintas)?
- ¿El límite es fijo en el sistema o configurable por plato/categoría?

Tamaño estimado: mediano. No es un simple agregado, requiere modelo de datos y reglas de negocio bien definidas primero.

### 5.2. Gestión de ingredientes, costos e inventario

Sistema de recetas (ingredientes y cantidades por menú) + costos unitarios + control de stock. Permitiría saber el costo real de cada plato y llevar inventario de cocina.

**Esto es un proyecto nuevo y separado, no una mejora del módulo de menús actual.** Incluye: tabla de ingredientes (unidad, costo, proveedor), receta por menú, control de entradas/salidas de stock, posibles alertas de quiebre.

Encaja como una propuesta comercial nueva para Loreto Belén (sistema de gestión a medida, con valor de venta claro: "sabes cuánto te cuesta cada plato, controlas tu stock"), a evaluar cuando el módulo de menús actual lleve un tiempo operando y el cliente vea valor en seguir invirtiendo.

---

## 6. Funcionalidades agregadas en sesiones del 18-28 de junio (resumen, no pendiente)

Para referencia rápida de lo que se sumó al módulo original:

- Modelo de precios simplificado: dos tarifas fijas por empresa (`precio_preferencial` / `precio_normal`, netos) configurables en `/panel/empresas`, elegidas al programar cada servicio. Reemplazó el modelo anterior de precio por menú+empresa+tipo de servicio (tabla `hostal_menu_prices` queda sin uso activo, no se borró).
- IVA (19%) calculado y mostrado por separado en reportes y Excel (columnas Precio Neto / Precio con IVA).
- Filtro por tipo de servicio (Almuerzo/Cena/Ambos) corregido en reportes.
- Formato de fechas DD-MM-YYYY en toda la UI visible y en el Excel (helper `formatDateCL()` en `src/lib/utils/date.ts`).
- Sincronización incremental de huéspedes en un servicio ya creado (botón "Sincronizar huéspedes"), sin pisar elecciones ya registradas.
- Botón "Quitar" para eliminar a un huésped de un servicio sin dejar rastro (caso: reserva se cae antes de la fecha).
- Texto de plazo máximo de confirmación agregado al mensaje de WhatsApp.
- Validación de borrado de menús del catálogo: si está referenciado en servicios o consumos, se rechaza con mensaje claro indicando cuántas referencias hay, en vez de un error genérico de base de datos.
- Catálogo de menús limpiado de datos de prueba (19 de junio): quedan solo los 4 platos reales creados por Fernando, con formato y descripción normalizados.
- Agregar huésped manual a un servicio ya programado (20 de junio): cubre el caso de funcionarios que van solo a comer sin estar alojados en el hostal. Modal con búsqueda de huésped existente o creación al vuelo (reusa `createGuest`), selector de empresa (incluye "Particular"), `reservation_id: null` soportado sin romper reportes ni resolución de precio. Endpoint nuevo `POST /api/meal-services/[id]/consumption/manual`, con validación de duplicados.
- Nomenclatura de opciones uniformizada a A/B (28 de junio): antes el mensaje de WhatsApp decía "Opción 1/2" mientras la tabla de gestión y los contadores usaban "Opción A/B", generando confusión. Ahora los 3 lugares (mensaje real, preview del modal, tabla de gestión) usan A/B de forma consistente, y la columna "Estado" de la tabla muestra el nombre real del plato junto a la letra (ej. "B: Pollo estofado con arroz graneado y ensalada") en vez de solo la letra sola.

---

*Este documento se actualiza manualmente. Revisar y depurar cada vez que se cierre una ronda de mejoras.*
