-- ============================================================================
-- Memory Events — 0009: Reservas sin planificador_id desde frontend
-- ============================================================================

-- Completa reservas.planificador_id desde auth.uid() antes de validar RLS.
-- El frontend solo envía evento_id y datos propios de la reserva.
create or replace function fn_reserva_planificador_desde_auth()
returns trigger language plpgsql as $$
begin
  new.planificador_id := auth.uid();
  return new;
end;
$$;

create trigger trg_reserva_planificador_auth
before insert on reservas
for each row execute function fn_reserva_planificador_desde_auth();

-- Crea cabecera + detalles en una sola transacción de PostgreSQL.
-- No acepta codigo, cliente_id ni planificador_id desde el cliente.
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
      reserva_id, servicio_id, nombre, cantidad, precio_unitario, observaciones
    ) values (
      v_reserva.id,
      nullif(v_servicio->>'servicio_id', '')::bigint,
      v_servicio->>'nombre',
      coalesce((v_servicio->>'cantidad')::integer, 1),
      coalesce((v_servicio->>'precio_unitario')::numeric, 0),
      nullif(v_servicio->>'observaciones', '')
    );
  end loop;

  return v_reserva;
end;
$$;

-- Actualiza cabecera, elimina detalles anteriores e inserta los vigentes
-- en una sola transacción. La FK reserva_servicios.reserva_id evita huérfanos.
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
      reserva_id, servicio_id, nombre, cantidad, precio_unitario, observaciones
    ) values (
      p_reserva_id,
      nullif(v_servicio->>'servicio_id', '')::bigint,
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
