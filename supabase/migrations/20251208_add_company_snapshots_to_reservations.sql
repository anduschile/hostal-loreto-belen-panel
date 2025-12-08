
-- Add company snapshot columns to reservations table
alter table public.hostal_reservations
add column if not exists company_name_snapshot text,
add column if not exists billing_type text default 'particular',
add column if not exists discount_type_snapshot text,
add column if not exists discount_value_snapshot numeric;

-- Ensure company_id is present (just in case)
-- It likely exists given the previous code context, but safe to verify or add index
create index if not exists idx_hostal_reservations_company_id on public.hostal_reservations(company_id);
