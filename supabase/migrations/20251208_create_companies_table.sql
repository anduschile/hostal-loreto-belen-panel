
-- Create companies table
create table if not exists public.hostal_companies (
  id bigint generated always as identity primary key,
  name text not null,
  rut text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  discount_type text check (discount_type in ('porcentaje', 'monto_fijo', 'ninguno')),
  discount_value numeric default 0,
  credit_days integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies
alter table public.hostal_companies enable row level security;

create policy "Enable all access for admins and reception"
on public.hostal_companies
for all
to authenticated
using (true)
with check (true);
