-- Add estado_servicio column to track whether a meal was consumed or cancelled (but still billable)
ALTER TABLE hostal_meal_consumption
ADD COLUMN estado_servicio TEXT NOT NULL DEFAULT 'activo'
CHECK (estado_servicio IN ('activo', 'anulado'));

-- Index for filtering by estado_servicio
CREATE INDEX idx_meal_consumption_estado_servicio ON hostal_meal_consumption(estado_servicio);
