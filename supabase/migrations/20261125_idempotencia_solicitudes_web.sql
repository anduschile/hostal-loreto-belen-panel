-- Idempotencia de solicitudes web: si el sitio reintenta el mismo envío (p. ej. tras un
-- timeout de red sin saber si la solicitud anterior ya se creó), esta migración evita que
-- se cree una segunda fila idéntica en hostal_reservations.
--
-- 1) Columna nueva, nula por defecto (no rompe nada existente: las reservas creadas por
--    recepción o por canales distintos a la API pública web simplemente la dejan en null).
alter table public.hostal_reservations
  add column if not exists source_idempotency_key text;

-- 2) Índice único parcial: solo exige unicidad cuando la columna no es null, así que no
--    afecta a ninguna fila existente (todas tienen la columna en null hoy).
create unique index if not exists hostal_reservations_idempotency_key_uidx
  on public.hostal_reservations (source_idempotency_key)
  where source_idempotency_key is not null;

-- 3) La función que crea la solicitud: agrega el parámetro p_idempotency_key (opcional,
--    compatible con llamadas existentes que no lo manden) y, si ya existe una fila con esa
--    misma clave, devuelve esa fila en vez de crear una nueva. La búsqueda queda protegida
--    por el mismo advisory lock que ya usa la función para serializar las creaciones, así
--    que no hay condición de carrera entre dos reintentos simultáneos con la misma clave.
create or replace function public.hostal_public_create_request(
  p_check_in date,
  p_check_out date,
  p_room_type text,
  p_adults integer,
  p_children integer,
  p_full_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_client_ref text default null::text,
  p_hold_hours integer default 48,
  p_idempotency_key text default null::text
)
returns table(out_reservation_id bigint, out_code text, out_hold_expires_at timestamp with time zone)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_type  text := lower(trim(coalesce(p_room_type,'')));
  v_name  text := trim(coalesce(p_full_name,''));
  v_email text := lower(trim(coalesce(p_email,'')));
  v_phone text := nullif(trim(coalesce(p_phone,'')),'');
  v_notes text := nullif(trim(coalesce(p_notes,'')),'');
  v_room  public.hostal_rooms%rowtype;
  v_guest_id bigint;
  v_code text;
  v_id bigint;
  v_hold timestamptz;
  v_idem text := nullif(trim(coalesce(p_idempotency_key,'')),'');
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in
     or p_check_in < (now() at time zone 'America/Santiago')::date then
    raise exception 'FECHAS_INVALIDAS';
  end if;
  if p_check_out - p_check_in > 30 then raise exception 'ESTADIA_MUY_LARGA'; end if;
  if v_type not in ('matrimonial','doble','triple','cuadruple') then raise exception 'TIPO_INVALIDO'; end if;
  if p_adults is null or p_adults < 1 or p_adults > 6
     or p_children is null or p_children < 0 or p_children > 6 then
    raise exception 'DATOS_INVALIDOS';
  end if;
  if length(v_name) < 3 or length(v_name) > 120
     or length(v_email) > 160 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or length(coalesce(v_phone,'')) > 30
     or length(coalesce(v_notes,'')) > 500
     or length(coalesce(p_client_ref,'')) > 64
     or length(coalesce(v_idem,'')) > 64
     or coalesce(p_hold_hours,48) not between 1 and 168 then
    raise exception 'DATOS_INVALIDOS';
  end if;

  perform pg_advisory_xact_lock(hashtext('hostal_public_booking'));

  -- Reintento idempotente: si ya existe una solicitud con esta misma clave, se devuelve
  -- tal cual (sin volver a contar límites ni crear nada nuevo).
  if v_idem is not null then
    select r.id, r.code, r.hold_expires_at
      into v_id, v_code, v_hold
    from public.hostal_reservations r
    where r.source_idempotency_key = v_idem;

    if found then
      return query select v_id, v_code, v_hold;
      return;
    end if;
  end if;

  if p_client_ref is not null and (
       select count(*) from public.hostal_reservations
       where source = 'web' and source_reference = p_client_ref
         and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'DEMASIADAS_SOLICITUDES';
  end if;
  if (select count(*) from public.hostal_reservations r
        join public.hostal_guests g on g.id = r.guest_id
       where r.source = 'web' and lower(trim(g.email)) = v_email
         and r.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'DEMASIADAS_SOLICITUDES';
  end if;
  if (select count(*) from public.hostal_reservations
       where source = 'web' and status = 'pending' and hold_expires_at > now()) >= 15 then
    raise exception 'DEMASIADAS_SOLICITUDES';
  end if;

  select f.* into v_room
  from public.hostal_free_rooms(p_check_in, p_check_out) f
  where lower(f.room_type) = v_type
    and (f.capacity_adults + f.capacity_children) >= (p_adults + p_children)
  order by (f.capacity_adults + f.capacity_children), f.sort_order, f.id
  limit 1;
  if not found then raise exception 'NO_DISPONIBLE'; end if;

  select g.id into v_guest_id
  from public.hostal_guests g
  where g.is_active and lower(trim(g.email)) = v_email
    and lower(trim(g.full_name)) = lower(v_name)
  order by g.id limit 1;
  if v_guest_id is null then
    insert into public.hostal_guests (full_name, email, phone, is_active)
    values (v_name, v_email, v_phone, true)
    returning id into v_guest_id;
  end if;

  v_code := 'W' || to_char(now() at time zone 'America/Santiago','YYYYMMDDHH24MISS')
            || lpad((floor(random()*1000))::int::text, 3, '0');
  v_hold := now() + make_interval(hours => coalesce(p_hold_hours,48));

  insert into public.hostal_reservations
    (code, status, source, source_reference, channel_note, check_in, check_out, nights,
     adults, children, room_id, guest_id, total_price, notes, hold_expires_at, source_idempotency_key)
  values
    (v_code, 'pending', 'web', p_client_ref, 'Solicitud web pendiente de confirmación',
     p_check_in, p_check_out, p_check_out - p_check_in,
     p_adults, p_children, v_room.id, v_guest_id, 0, v_notes, v_hold, v_idem)
  returning id into v_id;

  return query select v_id, v_code, v_hold;
end $function$;
