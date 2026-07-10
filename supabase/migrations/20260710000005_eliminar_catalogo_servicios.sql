-- ============================================================================
-- Memory Events — Eliminar catálogo legacy `servicios`
-- ============================================================================
-- La tabla `servicios` no participa en el flujo operativo actual. Las reservas
-- guardan sus líneas facturables en `reserva_servicios` como texto denormalizado
-- (nombre/cantidad/precio), y las boletas se generan desde esas líneas.

-- 1) Retirar la única dependencia estructural real.
alter table if exists reserva_servicios
  drop constraint if exists reserva_servicios_servicio_id_fkey;

drop index if exists idx_rs_servicio;

alter table if exists reserva_servicios
  drop column if exists servicio_id;

-- 2) Reemplazar las RPC de reservas para que ignoren cualquier servicio_id
-- residual enviado por clientes antiguos.
create or replace function fn_crear_reserva_con_servicios(
  p_campos jsonb,
  p_servicios jsonb default '[]'::jsonb
)
returns reservas
language plpgsql
as $$
declare
  v_reserva reservas%rowtype;
  v_servicio jsonb;
  v_total numeric(10,2) := coalesce((p_campos->>'total')::numeric, 0);
  v_adelanto numeric(10,2) := coalesce((p_campos->>'adelanto')::numeric, 0);
begin
  insert into reservas (
    evento_id, fecha, estado, total, adelanto, saldo, notas
  ) values (
    (p_campos->>'evento_id')::bigint,
    (p_campos->>'fecha')::date,
    coalesce((p_campos->>'estado')::estado_reserva, 'Pendiente'::estado_reserva),
    v_total,
    v_adelanto,
    greatest(0, v_total - v_adelanto),
    nullif(p_campos->>'notas', '')
  )
  returning * into v_reserva;

  for v_servicio in select * from jsonb_array_elements(coalesce(p_servicios, '[]'::jsonb)) loop
    insert into reserva_servicios (
      reserva_id, nombre, cantidad, precio_unitario, observaciones
    ) values (
      v_reserva.id,
      v_servicio->>'nombre',
      coalesce((v_servicio->>'cantidad')::integer, 1),
      coalesce((v_servicio->>'precio_unitario')::numeric, 0),
      nullif(v_servicio->>'observaciones', '')
    );
  end loop;

  return v_reserva;
end;
$$;

create or replace function fn_actualizar_reserva_con_servicios(
  p_reserva_id bigint,
  p_campos jsonb,
  p_servicios jsonb default '[]'::jsonb
)
returns reservas
language plpgsql
as $$
declare
  v_reserva reservas%rowtype;
  v_servicio jsonb;
  v_total numeric(10,2);
  v_adelanto numeric(10,2);
begin
  select
    coalesce((p_campos->>'total')::numeric, total),
    coalesce((p_campos->>'adelanto')::numeric, adelanto)
  into v_total, v_adelanto
  from reservas
  where id = p_reserva_id;

  if v_total is null then
    raise exception 'Reserva no encontrada o sin permisos';
  end if;

  update reservas
  set
    evento_id = coalesce((p_campos->>'evento_id')::bigint, evento_id),
    fecha = coalesce((p_campos->>'fecha')::date, fecha),
    estado = coalesce((p_campos->>'estado')::estado_reserva, estado),
    total = v_total,
    adelanto = v_adelanto,
    saldo = greatest(0, v_total - v_adelanto),
    notas = case when p_campos ? 'notas' then nullif(p_campos->>'notas', '') else notas end
  where id = p_reserva_id
  returning * into v_reserva;

  delete from reserva_servicios
  where reserva_id = p_reserva_id;

  for v_servicio in select * from jsonb_array_elements(coalesce(p_servicios, '[]'::jsonb)) loop
    insert into reserva_servicios (
      reserva_id, nombre, cantidad, precio_unitario, observaciones
    ) values (
      p_reserva_id,
      v_servicio->>'nombre',
      coalesce((v_servicio->>'cantidad')::integer, 1),
      coalesce((v_servicio->>'precio_unitario')::numeric, 0),
      nullif(v_servicio->>'observaciones', '')
    );
  end loop;

  return v_reserva;
end;
$$;

grant execute on function fn_crear_reserva_con_servicios(jsonb, jsonb) to authenticated;
grant execute on function fn_actualizar_reserva_con_servicios(bigint, jsonb, jsonb) to authenticated;

-- 3) Eliminar políticas, trigger, índice único y tabla legacy.
do $$
begin
  if to_regclass('public.servicios') is not null then
    drop policy if exists servicios_select on servicios;
    drop policy if exists servicios_insert on servicios;
    drop policy if exists servicios_update on servicios;
    drop policy if exists servicios_delete on servicios;
    drop trigger if exists trg_touch_servicios on servicios;
  end if;
end;
$$;

drop index if exists uq_servicios_nombre;

drop table if exists servicios;
