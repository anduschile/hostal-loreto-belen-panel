-- ==============================================================================
-- Cotizador: etiqueta del descuento (motivo o «Descuento convenio»)
-- Ya aplicada en producción (migración cotizador_discount_label).
-- Archivo solo para documentación y reproducibilidad.
-- ==============================================================================

alter table public.hostal_quotes add column if not exists discount_label text;
