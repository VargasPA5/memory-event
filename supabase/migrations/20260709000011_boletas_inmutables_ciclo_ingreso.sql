-- ============================================================================
-- Memory Events — 0011: Ciclo contable de boletas inmutables
-- ============================================================================

-- Decisión de negocio:
-- La boleta nunca se edita. Si un ingreso pagado cambia en un dato fiscal, la
-- boleta vigente pasa a Anulada y se genera una nueva con la información actual.
-- Cambios no fiscales, como metodo de pago, no generan otra boleta.

create or replace function fn_generar_boleta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boleta          boletas%rowtype;
  v_boleta_id       bigint;
  v_reserva         reservas%rowtype;
  v_pagado          numeric(10,2);
  v_saldo           numeric(10,2);
  v_subtotal        numeric(10,2);
  v_servicios_sig   text;
  v_boleta_sig      text;
  v_requiere_nueva  boolean := false;
begin
  select *
    into v_boleta
  from boletas
  where ingreso_id = new.id
    and estado = 'Emitida'
  order by created_at desc, id desc
  limit 1;

  if new.estado <> 'Pagado' then
    if v_boleta.id is not null then
      update boletas
      set estado = 'Anulada',
          motivo_anulacion = 'Ingreso cambió a estado ' || new.estado
      where id = v_boleta.id;
    end if;

    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if v_boleta.id is not null
       and new.metodo is distinct from old.metodo
       and new.estado is not distinct from old.estado
       and new.monto is not distinct from old.monto
       and new.reserva_id is not distinct from old.reserva_id
       and new.fecha is not distinct from old.fecha
       and coalesce(new.concepto, '') is not distinct from coalesce(old.concepto, '') then
      return new;
    end if;
  end if;

  select *
    into v_reserva
  from reservas
  where id = new.reserva_id;

  if v_reserva.id is null then
    raise exception 'Reserva % no encontrada para generar boleta', new.reserva_id;
  end if;

  select coalesce(sum(monto), 0)
    into v_pagado
  from ingresos
  where reserva_id = new.reserva_id
    and estado = 'Pagado';

  v_saldo := greatest(0, coalesce(v_reserva.total, 0) - v_pagado);

  if exists (select 1 from reserva_servicios where reserva_id = new.reserva_id) then
    select coalesce(sum(subtotal), 0)
      into v_subtotal
    from reserva_servicios
    where reserva_id = new.reserva_id;

    select coalesce(
      string_agg(
        concat_ws('|', nombre, cantidad, precio_unitario, subtotal, coalesce(observaciones, '')),
        '||' order by id
      ),
      ''
    )
      into v_servicios_sig
    from reserva_servicios
    where reserva_id = new.reserva_id;
  else
    v_subtotal := new.monto;
    v_servicios_sig := concat_ws('|', coalesce(v_reserva.codigo, new.concepto, 'Pago'), 1, new.monto, new.monto, '');
  end if;

  if v_boleta.id is not null then
    select coalesce(
      string_agg(
        concat_ws('|', nombre, cantidad, precio_unitario, subtotal, coalesce(observaciones, '')),
        '||' order by id
      ),
      ''
    )
      into v_boleta_sig
    from boleta_servicios
    where boleta_id = v_boleta.id;

    v_requiere_nueva :=
      v_boleta.planificador_id is distinct from new.planificador_id
      or v_boleta.cliente_id is distinct from new.cliente_id
      or v_boleta.evento_id is distinct from v_reserva.evento_id
      or v_boleta.reserva_id is distinct from new.reserva_id
      or v_boleta.fecha::date is distinct from new.fecha
      or v_boleta.subtotal is distinct from v_subtotal
      or v_boleta.total is distinct from v_subtotal
      or v_boleta.monto_pagado is distinct from new.monto
      or v_boleta.saldo_pendiente is distinct from v_saldo
      or v_boleta_sig is distinct from v_servicios_sig;

    if not v_requiere_nueva then
      return new;
    end if;

    update boletas
    set estado = 'Anulada',
        motivo_anulacion = 'Ingreso modificado con impacto fiscal'
    where id = v_boleta.id;
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
