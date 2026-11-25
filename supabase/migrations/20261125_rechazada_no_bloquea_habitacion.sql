-- NO APLICADA. Revisar y aplicar a mano antes de poner en producción el estado "rechazada".
-- hostal_free_rooms (disponibilidad pública y asignación de habitación en las solicitudes web)
-- solo ignora cancelled/cancelada/checked_out/salida. Sin este cambio, una solicitud rechazada
-- seguiría bloqueando la habitación para el sitio público.
-- Único cambio respecto de la definición actual: se agrega 'rechazada' a la lista de estados ignorados.
CREATE OR REPLACE FUNCTION public.hostal_free_rooms(p_check_in date, p_check_out date)
 RETURNS SETOF hostal_rooms
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.*
  from public.hostal_rooms r
  where r.is_archived = false
    and r.status not in ('archivada','fuera_servicio','mantenimiento')
    and lower(r.room_type) in ('matrimonial','doble','triple','cuadruple')
    and not exists (
      select 1 from public.hostal_reservations x
      where x.room_id = r.id
        and x.status not in ('cancelled','cancelada','rechazada','checked_out','salida')
        and not (x.status = 'pending' and x.hold_expires_at is not null and x.hold_expires_at <= now())
        and x.check_in < p_check_out
        and p_check_in < x.check_out
    );
$function$;
