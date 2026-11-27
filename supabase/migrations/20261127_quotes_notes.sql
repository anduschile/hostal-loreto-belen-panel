-- Observaciones libres a nivel de cotización completa (no por línea de habitación).
alter table public.hostal_quotes add column if not exists notes text;
