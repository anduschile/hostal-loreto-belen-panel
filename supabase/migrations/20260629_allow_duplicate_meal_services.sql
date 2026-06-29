-- Remove UNIQUE constraint on (fecha, tipo_servicio) to allow multiple services
-- of the same type on the same date (e.g., two "Cena" for 2026-06-29)

ALTER TABLE hostal_meal_services
DROP CONSTRAINT hostal_meal_services_fecha_tipo_servicio_key;

-- No new constraint added: the business logic now handles conflicts via UI/autoload logic
-- See: src/app/panel/menus/programar/page.tsx - autoload detects conflicts and skips auto-assignment
