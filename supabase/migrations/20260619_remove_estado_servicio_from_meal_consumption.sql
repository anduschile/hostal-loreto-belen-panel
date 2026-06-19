-- Remove estado_servicio column from hostal_meal_consumption table
DROP INDEX IF EXISTS idx_meal_consumption_estado_servicio;

ALTER TABLE hostal_meal_consumption
DROP COLUMN estado_servicio;
