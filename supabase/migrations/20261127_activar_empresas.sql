-- Activa todas las empresas cargadas en hostal_companies (solo 4 de 94 estaban activas
-- y el resto quedaba oculto del desplegable de cotizaciones sin motivo de negocio).
UPDATE public.hostal_companies SET is_active = true, updated_at = now() WHERE is_active = false;
