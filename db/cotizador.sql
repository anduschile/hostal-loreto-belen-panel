-- ============================================================================
-- Módulo Cotizador — PROPUESTA PARA REVISIÓN. NO aplicada a producción.
-- Solo crea tablas nuevas; no modifica ninguna tabla existente
-- (hostal_companies se usa únicamente por lectura: discount_type / discount_value).
-- ============================================================================

-- 1) Tarifas netas por noche (0 = «tarifa sin cargar»)
create table if not exists public.hostal_quote_rates (
  occupancy  text primary key check (occupancy in ('single','doble','triple','cuadruple')),
  net_rate   integer not null default 0 check (net_rate >= 0),
  updated_at timestamptz not null default now()
);
insert into public.hostal_quote_rates (occupancy)
values ('single'),('doble'),('triple'),('cuadruple')
on conflict (occupancy) do nothing;

-- 2) Configuración (una sola fila)
create table if not exists public.hostal_quote_settings (
  id                    smallint primary key default 1 check (id = 1),
  validity_days         integer not null default 7 check (validity_days > 0),
  validity_provisional  boolean not null default true,
  -- interruptor para el sitio público; AÚN sin conectar a nada
  mode                  text not null default 'revision' check (mode in ('automatico','revision')),
  default_conditions    text not null default E'Habitaciones con baño privado.\nIncluye desayuno.\nIncluye estacionamiento privado sin costo, sujeto a disponibilidad.',
  updated_at            timestamptz not null default now()
);
insert into public.hostal_quote_settings (id) values (1) on conflict (id) do nothing;

-- 3) Cotizaciones. Numeración correlativa COT-0001 mediante secuencia.
create sequence if not exists public.hostal_quote_number_seq start 1;

create table if not exists public.hostal_quotes (
  id               bigserial primary key,
  number           integer not null unique default nextval('public.hostal_quote_number_seq'),
  company_id       bigint references public.hostal_companies(id) on delete set null,
  company_name     text not null,
  company_rut      text,
  contact_name     text,
  contact_email    text,
  check_in         date not null,
  check_out        date not null,
  lines            jsonb not null default '[]'::jsonb,  -- [{occupancy, rooms, nights, rate_override}]
  discount_type    text not null default 'ninguno' check (discount_type in ('porcentaje','monto_fijo','ninguno')),
  discount_value   numeric not null default 0,
  gross            integer not null default 0,
  discount         integer not null default 0,
  net              integer not null default 0,
  iva              integer not null default 0,
  total            integer not null default 0,
  validity_days    integer not null default 7,
  valid_until      date,
  conditions       text,
  status           text not null default 'borrador' check (status in ('borrador','enviada','aceptada','rechazada','vencida')),
  sent_at          timestamptz,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (check_out > check_in)
);
create index if not exists hostal_quotes_status_idx  on public.hostal_quotes(status);
create index if not exists hostal_quotes_created_idx on public.hostal_quotes(created_at desc);

-- 4) RLS. «Usuario del panel» = fila activa en hostal_users.
alter table public.hostal_quote_rates    enable row level security;
alter table public.hostal_quote_settings enable row level security;
alter table public.hostal_quotes         enable row level security;

create or replace function public.hostal_is_panel_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.hostal_users u
                 where u.supabase_user_id = auth.uid() and u.is_active)
$$;
create or replace function public.hostal_is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.hostal_users u
                 where u.supabase_user_id = auth.uid() and u.is_active and u.role = 'superadmin')
$$;

-- Tarifas y configuración: lectura para el panel, escritura solo superadmin
create policy quote_rates_read on public.hostal_quote_rates
  for select to authenticated using (public.hostal_is_panel_user());
create policy quote_rates_write on public.hostal_quote_rates
  for all to authenticated using (public.hostal_is_superadmin()) with check (public.hostal_is_superadmin());
create policy quote_settings_read on public.hostal_quote_settings
  for select to authenticated using (public.hostal_is_panel_user());
create policy quote_settings_write on public.hostal_quote_settings
  for all to authenticated using (public.hostal_is_superadmin()) with check (public.hostal_is_superadmin());

-- Cotizaciones: cualquier usuario activo del panel
create policy quotes_all on public.hostal_quotes
  for all to authenticated using (public.hostal_is_panel_user()) with check (public.hostal_is_panel_user());
