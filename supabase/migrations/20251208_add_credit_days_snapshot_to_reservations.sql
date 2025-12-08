
-- Add credit_days_snapshot column to reservations table
alter table public.hostal_reservations
add column if not exists credit_days_snapshot integer;
