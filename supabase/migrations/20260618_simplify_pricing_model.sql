-- Cambio de Diseño 1: Simplificar modelo de precios
-- Agregar precios fijos a empresas y tipo_precio a meal_services

ALTER TABLE hostal_companies
ADD COLUMN precio_preferencial NUMERIC DEFAULT 0,
ADD COLUMN precio_normal NUMERIC DEFAULT 0;

ALTER TABLE hostal_meal_services
ADD COLUMN tipo_precio TEXT NOT NULL DEFAULT 'preferencial'
CHECK (tipo_precio IN ('preferencial', 'normal'));

-- Índice para mejorar queries de resolución de precio
CREATE INDEX idx_meal_services_company_tipo ON hostal_meal_services(fecha, tipo_servicio);
