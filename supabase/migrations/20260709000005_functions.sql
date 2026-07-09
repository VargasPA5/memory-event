-- ============================================================================
-- Memory Events — 0005: Funciones
-- ============================================================================

-- 5.1 Alta automática de perfil al registrarse en Supabase Auth ---------------
create or replace function fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)), 'Planificador');
  return new;
end;
$$;

-- 5.2 Auditoría genérica (created_by/updated_by vía auth.uid()) ---------------
create or replace function fn_set_audit_fields()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := auth.uid();
    new.updated_at := now();
    new.updated_by := auth.uid();
  elsif TG_OP = 'UPDATE' then
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

-- 5.3 updated_at simple para catálogos sin ownership ---------------------------
create or replace function fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 5.4 Códigos correlativos atómicos (reservas / ingresos) ----------------------
create or replace function fn_generar_codigo_reserva()
returns trigger language plpgsql as $$
begin
  if new.codigo is null then
    new.codigo := 'RES-' || lpad(nextval('reservas_codigo_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

create or replace function fn_generar_codigo_ingreso()
returns trigger language plpgsql as $$
begin
  if new.codigo is null then
    new.codigo := 'PAG-' || lpad(nextval('ingresos_codigo_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

-- 5.5 Ownership denormalizado, siempre derivado del padre (nunca confiado al
--     cliente): reservas.cliente_id ← eventos.cliente_id --------------------
create or replace function fn_reserva_cliente_desde_evento()
returns trigger language plpgsql as $$
begin
  select cliente_id into new.cliente_id from eventos where id = new.evento_id;
  return new;
end;
$$;

-- 5.6 Mismo patrón que 5.5: ingresos.planificador_id ← reservas.planificador_id
--     cuando el ingreso está asociado a una reserva (evita que un ingreso quede
--     "huérfano" de dueño distinto al de la reserva que paga). ----------------
create or replace function fn_ingreso_planificador_desde_reserva()
returns trigger language plpgsql as $$
begin
  if new.reserva_id is not null then
    select planificador_id into new.planificador_id from reservas where id = new.reserva_id;
  end if;
  return new;
end;
$$;

-- 5.7 Mismo patrón: gastos.planificador_id ← eventos.planificador_id ----------
create or replace function fn_gasto_planificador_desde_evento()
returns trigger language plpgsql as $$
begin
  select planificador_id into new.planificador_id from eventos where id = new.evento_id;
  return new;
end;
$$;

-- 5.8 Sincroniza reservas.saldo con la suma de ingresos pagados ----------------
create or replace function fn_sync_saldo_reserva()
returns trigger language plpgsql as $$
declare
  v_reserva_id bigint;
  v_total      numeric;
  v_pagado     numeric;
begin
  v_reserva_id := coalesce(new.reserva_id, old.reserva_id);
  if v_reserva_id is null then
    return coalesce(new, old);
  end if;
  select total into v_total from reservas where id = v_reserva_id;
  select coalesce(sum(monto), 0) into v_pagado from ingresos
    where reserva_id = v_reserva_id and estado = 'Pagado';
  update reservas set saldo = greatest(0, coalesce(v_total, 0) - v_pagado) where id = v_reserva_id;
  return coalesce(new, old);
end;
$$;

-- 5.9 Generación automática de boleta al registrar un pago ---------------------
--     Rediseñada para inmutabilidad: si YA existe una boleta ACTIVA (Emitida)
--     para este ingreso, no se toca (una boleta emitida nunca se reescribe).
--     Solo se genera una nueva si no hay ninguna activa (primera vez, o la
--     anterior fue anulada explícitamente — ver fn_proteger_boleta_inmutable).
--     security definer: los usuarios no tienen permiso de INSERT directo sobre
--     boletas/boleta_servicios (ver RLS, 0007) — solo esta función puede crearlas.
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
  select id into v_boleta_id from boletas where ingreso_id = new.id and estado = 'Emitida';
  if v_boleta_id is not null then
    return new;
  end if;

  if new.reserva_id is not null then
    select * into v_reserva from reservas where id = new.reserva_id;
    select coalesce(sum(monto), 0) into v_pagado from ingresos
      where reserva_id = new.reserva_id and estado = 'Pagado';
    v_saldo := greatest(0, coalesce(v_reserva.total, 0) - v_pagado);
  else
    v_saldo := 0;
  end if;

  if new.reserva_id is not null and exists (select 1 from reserva_servicios where reserva_id = new.reserva_id) then
    select coalesce(sum(subtotal), 0) into v_subtotal from reserva_servicios where reserva_id = new.reserva_id;
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

  if new.reserva_id is not null and exists (select 1 from reserva_servicios where reserva_id = new.reserva_id) then
    insert into boleta_servicios (boleta_id, nombre, cantidad, precio_unitario, subtotal, observaciones)
    select v_boleta_id, nombre, cantidad, precio_unitario, subtotal, observaciones
    from reserva_servicios where reserva_id = new.reserva_id;
  else
    insert into boleta_servicios (boleta_id, nombre, cantidad, precio_unitario, subtotal)
    values (v_boleta_id, coalesce(v_reserva.codigo, new.concepto, 'Pago'), 1, new.monto, new.monto);
  end if;

  return new;
end;
$$;

-- 5.10 Boleta inmutable: el único cambio permitido es Emitida → Anulada -------
--      No hay excepción de administrador: nadie reescribe una boleta emitida,
--      ni siquiera un admin. Corregir información = anular + dejar que
--      fn_generar_boleta cree una nueva la próxima vez que se toque el ingreso.
create or replace function fn_proteger_boleta_inmutable()
returns trigger language plpgsql as $$
begin
  if old.estado = 'Anulada' then
    raise exception 'Una boleta anulada no puede modificarse';
  end if;

  if new.estado is distinct from old.estado then
    if new.estado <> 'Anulada' then
      raise exception 'El único cambio de estado permitido en una boleta es a Anulada';
    end if;
    -- Se sella automáticamente quién y cuándo; no se confía en lo que mande el cliente.
    new.anulado_en  := now();
    new.anulado_por := auth.uid();
  else
    if new.numero            is distinct from old.numero
       or new.ingreso_id      is distinct from old.ingreso_id
       or new.planificador_id is distinct from old.planificador_id
       or new.cliente_id      is distinct from old.cliente_id
       or new.evento_id       is distinct from old.evento_id
       or new.reserva_id      is distinct from old.reserva_id
       or new.fecha           is distinct from old.fecha
       or new.subtotal        is distinct from old.subtotal
       or new.impuestos       is distinct from old.impuestos
       or new.total           is distinct from old.total
       or new.monto_pagado    is distinct from old.monto_pagado
       or new.saldo_pendiente is distinct from old.saldo_pendiente
       or new.motivo_anulacion is distinct from old.motivo_anulacion
    then
      raise exception 'Una boleta emitida es inmutable; anúlala y deja que se genere una nueva si necesitas corregir información';
    end if;
  end if;

  return new;
end;
$$;

-- 5.11 Historial de cambios significativos de un evento -------------------------
create or replace function fn_registrar_historial_evento()
returns trigger language plpgsql as $$
begin
  if new.fecha is distinct from old.fecha then
    insert into evento_historial(evento_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
    values (new.id, 'fecha', old.fecha::text, new.fecha::text, auth.uid());
  end if;
  if new.lugar is distinct from old.lugar then
    insert into evento_historial(evento_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
    values (new.id, 'lugar', old.lugar, new.lugar, auth.uid());
  end if;
  if new.estado is distinct from old.estado then
    insert into evento_historial(evento_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
    values (new.id, 'estado', old.estado::text, new.estado::text, auth.uid());
  end if;
  if new.presupuesto is distinct from old.presupuesto then
    insert into evento_historial(evento_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
    values (new.id, 'presupuesto', old.presupuesto::text, new.presupuesto::text, auth.uid());
  end if;
  if new.planificador_id is distinct from old.planificador_id then
    insert into evento_historial(evento_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
    values (new.id, 'planificador_id', old.planificador_id::text, new.planificador_id::text, auth.uid());
  end if;
  return new;
end;
$$;

-- 5.12 Notificaciones automáticas -------------------------------------------------
create or replace function fn_notificar_cliente_nuevo()
returns trigger language plpgsql as $$
begin
  insert into notificaciones (destinatario_id, tipo, titulo, cliente_id)
  values (new.planificador_id, 'cliente_nuevo', 'Nuevo cliente: ' || new.nombre, new.id);
  return new;
end;
$$;

create or replace function fn_notificar_reserva_creada()
returns trigger language plpgsql as $$
begin
  insert into notificaciones (destinatario_id, tipo, titulo, evento_id, reserva_id)
  values (new.planificador_id, 'reserva_creada', 'Nueva reserva: ' || new.codigo, new.evento_id, new.id);
  return new;
end;
$$;

create or replace function fn_notificar_pago_registrado()
returns trigger language plpgsql as $$
begin
  insert into notificaciones (destinatario_id, tipo, titulo, reserva_id, ingreso_id)
  values (new.planificador_id, 'pago_registrado', 'Pago registrado: S/ ' || new.monto, new.reserva_id, new.id);
  return new;
end;
$$;

create or replace function fn_notificar_boleta_generada()
returns trigger language plpgsql as $$
begin
  insert into notificaciones (destinatario_id, tipo, titulo, boleta_id)
  values (new.planificador_id, 'boleta_generada', 'Boleta generada: ' || new.numero, new.id);
  return new;
end;
$$;

-- 5.13 Protege rol/estado de perfiles: solo un administrador puede cambiarlos ---
create or replace function fn_proteger_rol_perfil()
returns trigger language plpgsql as $$
begin
  if (new.rol is distinct from old.rol or new.estado is distinct from old.estado)
     and not exists (select 1 from perfiles where id = auth.uid() and rol = 'Administrador') then
    raise exception 'Solo un administrador puede cambiar el rol o el estado de un perfil';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 5.14 Autocompleta quién y cuándo se completó un ítem del checklist -----------
create or replace function fn_checklist_completado()
returns trigger language plpgsql as $$
begin
  if new.completado and not old.completado then
    new.completado_en  := now();
    new.completado_por := auth.uid();
  elsif not new.completado and old.completado then
    new.completado_en  := null;
    new.completado_por := null;
  end if;
  return new;
end;
$$;

-- 5.15 Helper de RLS: ¿el usuario autenticado es Administrador? ----------------
--      security definer + search_path fijo: evita recursión de RLS al consultar
--      perfiles desde políticas de otras tablas, y evita hijacking de search_path.
create or replace function es_administrador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'Administrador');
$$;
