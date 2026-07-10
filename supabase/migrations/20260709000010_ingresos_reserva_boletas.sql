-- ============================================================================
-- Memory Events — 0010: Ingresos siempre asociados a reserva
-- ============================================================================

-- Decisión de negocio:
-- En Memory Events, un ingreso representa un pago de una reserva. Por eso la
-- reserva pasa a ser obligatoria y la base deriva desde ella tanto cliente_id
-- como planificador_id. El frontend no debe enviar esos ownership fields.

-- 10.1 Bloquea datos heredados incompatibles antes de endurecer el modelo.
do $$
begin
  if exists (select 1 from ingresos where reserva_id is null) then
    raise exception 'No se puede aplicar 0010: existen ingresos sin reserva_id. Asocia esos ingresos a una reserva antes de migrar.';
  end if;
end $$;

alter table ingresos
  alter column reserva_id set not null;

-- 10.2 Ingresos heredan ownership y cliente desde la reserva.
-- Mantiene el nombre existente para no duplicar funciones ni romper referencias.
create or replace function fn_ingreso_planificador_desde_reserva()
returns trigger language plpgsql as $$
declare
  v_planificador_id uuid;
  v_cliente_id bigint;
begin
  if new.reserva_id is null then
    raise exception 'Todo ingreso debe estar asociado a una reserva';
  end if;

  select r.planificador_id, r.cliente_id
    into v_planificador_id, v_cliente_id
  from reservas r
  where r.id = new.reserva_id;

  if v_planificador_id is null or v_cliente_id is null then
    raise exception 'Reserva % no encontrada o no accesible', new.reserva_id;
  end if;

  new.planificador_id := v_planificador_id;
  new.cliente_id := v_cliente_id;
  return new;
end;
$$;

-- El trigger ya existía como BEFORE INSERT OR UPDATE OF reserva_id. Se recrea
-- con el mismo nombre para que también corrija intentos de cambiar cliente_id o
-- planificador_id sin cambiar reserva_id.
drop trigger if exists trg_ingreso_planificador on ingresos;
create trigger trg_ingreso_planificador
before insert or update on ingresos
for each row execute function fn_ingreso_planificador_desde_reserva();

-- 10.3 Recalcula saldos para la reserva anterior y la nueva cuando un pago se
-- mueve de reserva o cambia de estado/monto. Antes solo recalculaba una.
create or replace function fn_sync_saldo_reserva()
returns trigger language plpgsql as $$
declare
  v_reserva_id bigint;
  v_total      numeric;
  v_pagado     numeric;
begin
  for v_reserva_id in
    select distinct x.reserva_id
    from (
      select case when TG_OP in ('INSERT', 'UPDATE') then new.reserva_id end as reserva_id
      union all
      select case when TG_OP in ('UPDATE', 'DELETE') then old.reserva_id end as reserva_id
    ) x
    where x.reserva_id is not null
  loop
    select total into v_total
    from reservas
    where id = v_reserva_id;

    select coalesce(sum(monto), 0) into v_pagado
    from ingresos
    where reserva_id = v_reserva_id
      and estado = 'Pagado';

    update reservas
    set saldo = greatest(0, coalesce(v_total, 0) - v_pagado)
    where id = v_reserva_id;
  end loop;

  return coalesce(new, old);
end;
$$;

-- 10.4 La boleta se genera solo cuando el ingreso está Pagado. Si ya existe una
-- boleta activa para ese ingreso, no se crea otra. Las boletas emitidas siguen
-- siendo inmutables por trg_proteger_boleta_inmutable.
create or replace function fn_generar_boleta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boleta_id  bigint;
  v_reserva    reservas%rowtype;
  v_pagado     numeric(10,2);
  v_saldo      numeric(10,2);
  v_subtotal   numeric(10,2);
begin
  if new.estado <> 'Pagado' then
    return new;
  end if;

  select id into v_boleta_id
  from boletas
  where ingreso_id = new.id
    and estado = 'Emitida';

  if v_boleta_id is not null then
    return new;
  end if;

  select * into v_reserva
  from reservas
  where id = new.reserva_id;

  if v_reserva.id is null then
    raise exception 'Reserva % no encontrada para generar boleta', new.reserva_id;
  end if;

  select coalesce(sum(monto), 0) into v_pagado
  from ingresos
  where reserva_id = new.reserva_id
    and estado = 'Pagado';

  v_saldo := greatest(0, coalesce(v_reserva.total, 0) - v_pagado);

  if exists (select 1 from reserva_servicios where reserva_id = new.reserva_id) then
    select coalesce(sum(subtotal), 0) into v_subtotal
    from reserva_servicios
    where reserva_id = new.reserva_id;
  else
    v_subtotal := new.monto;
  end if;

  insert into boletas (
    numero, ingreso_id, planificador_id, cliente_id, evento_id, reserva_id,
    fecha, subtotal, total, monto_pagado, saldo_pendiente, created_by
  ) values (
    'BOL-' || lpad(nextval('boletas_numero_seq')::text, 3, '0'),
    new.id, new.planificador_id, new.cliente_id, v_reserva.evento_id, new.reserva_id,
    new.fecha, v_subtotal, v_subtotal, new.monto, v_saldo, new.created_by
  ) returning id into v_boleta_id;

  if exists (select 1 from reserva_servicios where reserva_id = new.reserva_id) then
    insert into boleta_servicios (boleta_id, nombre, cantidad, precio_unitario, subtotal, observaciones)
    select v_boleta_id, nombre, cantidad, precio_unitario, subtotal, observaciones
    from reserva_servicios
    where reserva_id = new.reserva_id;
  else
    insert into boleta_servicios (boleta_id, nombre, cantidad, precio_unitario, subtotal)
    values (v_boleta_id, coalesce(v_reserva.codigo, new.concepto, 'Pago'), 1, new.monto, new.monto);
  end if;

  return new;
end;
$$;
