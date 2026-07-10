-- ============================================================================
-- Memory Events — 0014: RPCs de Calendario Operativo
-- ============================================================================
-- RPCs pequeñas para el Calendario. Todas usan SECURITY INVOKER para respetar
-- RLS de las tablas base: Administrador ve todo y Planificador solo lo suyo.

create or replace function fn_calendario_eventos(
  p_desde date,
  p_hasta date,
  p_estado text default null,
  p_tipo_id bigint default null,
  p_cliente_id bigint default null,
  p_proveedor_id bigint default null,
  p_planificador_id uuid default null,
  p_pagos_pendientes boolean default null,
  p_saldo_pendiente boolean default null,
  p_sin_proveedor boolean default null,
  p_sin_reserva boolean default null,
  p_checklist_incompleto boolean default null,
  p_con_anexos boolean default null,
  p_con_comentarios boolean default null,
  p_con_agenda boolean default null
)
returns table (
  id bigint,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  background_color text,
  border_color text,
  text_color text,
  estado text,
  tipo_nombre text,
  cliente_nombre text,
  planificador_nombre text,
  reserva_codigo text,
  reserva_estado text,
  reserva_total numeric,
  reserva_saldo numeric,
  pagado_total numeric,
  gastos_total numeric,
  proveedores_pendientes bigint,
  checklist_pendiente bigint,
  agenda_total bigint,
  anexos_total bigint,
  comentarios_total bigint,
  alertas jsonb,
  extended_props jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      e.*,
      c.nombre as cliente_nombre,
      te.nombre as tipo_nombre,
      te.color as tipo_color,
      p.nombre as planificador_nombre
    from eventos e
    join clientes c on c.id = e.cliente_id
    join tipos_evento te on te.id = e.tipo_evento_id
    left join perfiles p on p.id = e.planificador_id
    where e.fecha between p_desde and p_hasta
      and (p_estado is null or e.estado::text = p_estado)
      and (p_tipo_id is null or e.tipo_evento_id = p_tipo_id)
      and (p_cliente_id is null or e.cliente_id = p_cliente_id)
      and (p_planificador_id is null or e.planificador_id = p_planificador_id)
      and (
        p_proveedor_id is null
        or exists (
          select 1 from evento_proveedores ep
          where ep.evento_id = e.id and ep.proveedor_id = p_proveedor_id
        )
      )
  )
  select
    b.id,
    b.nombre as title,
    (b.fecha::timestamp + coalesce(b.hora, time '09:00'))::timestamptz as start_at,
    (b.fecha::timestamp + coalesce(b.hora, time '09:00') + interval '2 hours')::timestamptz as end_at,
    coalesce(b.tipo_color,
      case b.estado
        when 'Confirmado' then '#10b981'
        when 'Pendiente' then '#f59e0b'
        when 'Realizado' then '#3b82f6'
        when 'Cancelado' then '#94a3b8'
        else '#c9a35a'
      end
    ) as background_color,
    case b.estado
      when 'Confirmado' then '#10b981'
      when 'Pendiente' then '#f59e0b'
      when 'Realizado' then '#3b82f6'
      when 'Cancelado' then '#94a3b8'
      else '#c9a35a'
    end as border_color,
    '#1a1917' as text_color,
    b.estado::text,
    b.tipo_nombre,
    b.cliente_nombre,
    b.planificador_nombre,
    r.codigo as reserva_codigo,
    r.estado::text as reserva_estado,
    coalesce(r.total, 0) as reserva_total,
    coalesce(r.saldo, 0) as reserva_saldo,
    coalesce(ing.pagado_total, 0) as pagado_total,
    coalesce(gas.gastos_total, 0) as gastos_total,
    coalesce(prov.proveedores_pendientes, 0) as proveedores_pendientes,
    coalesce(chk.checklist_pendiente, 0) as checklist_pendiente,
    coalesce(ag.agenda_total, 0) as agenda_total,
    coalesce(ax.anexos_total, 0) as anexos_total,
    coalesce(com.comentarios_total, 0) as comentarios_total,
    (
      select coalesce(jsonb_agg(x.alerta), '[]'::jsonb)
      from (
        select jsonb_build_object('nivel','critica','clave','proveedor_pendiente','texto','Proveedor pendiente') as alerta
        where coalesce(prov.proveedores_pendientes, 0) > 0
        union all
        select jsonb_build_object('nivel','critica','clave','saldo_pendiente','texto','Saldo pendiente')
        where coalesce(r.saldo, 0) > 0
        union all
        select jsonb_build_object('nivel','critica','clave','checklist_incompleto','texto','Checklist incompleto')
        where coalesce(chk.checklist_pendiente, 0) > 0
        union all
        select jsonb_build_object('nivel','critica','clave','sin_agenda','texto','Evento próximo sin agenda')
        where b.fecha between current_date and current_date + 14 and coalesce(ag.agenda_total, 0) = 0
        union all
        select jsonb_build_object('nivel','advertencia','clave','sin_anexos','texto','Sin anexos')
        where coalesce(ax.anexos_total, 0) = 0
        union all
        select jsonb_build_object('nivel','advertencia','clave','sin_comentarios','texto','Sin comentarios')
        where coalesce(com.comentarios_total, 0) = 0
        union all
        select jsonb_build_object('nivel','advertencia','clave','sin_decoracion','texto','Sin decoración')
        where coalesce(dec.decoraciones_total, 0) = 0
        union all
        select jsonb_build_object('nivel','advertencia','clave','sin_platos','texto','Sin platos')
        where coalesce(pla.platos_total, 0) = 0
      ) x
    ) as alertas,
    jsonb_build_object(
      'evento_id', b.id,
      'cliente_id', b.cliente_id,
      'tipo_evento_id', b.tipo_evento_id,
      'planificador_id', b.planificador_id,
      'lugar', b.lugar,
      'hora', b.hora,
      'reserva_id', r.id,
      'reserva_codigo', r.codigo,
      'reserva_estado', r.estado,
      'reserva_total', coalesce(r.total, 0),
      'reserva_saldo', coalesce(r.saldo, 0),
      'pagado_total', coalesce(ing.pagado_total, 0),
      'gastos_total', coalesce(gas.gastos_total, 0),
      'proveedores_pendientes', coalesce(prov.proveedores_pendientes, 0),
      'checklist_pendiente', coalesce(chk.checklist_pendiente, 0),
      'agenda_total', coalesce(ag.agenda_total, 0),
      'anexos_total', coalesce(ax.anexos_total, 0),
      'comentarios_total', coalesce(com.comentarios_total, 0)
    ) as extended_props
  from base b
  left join lateral (
    select *
    from reservas rr
    where rr.evento_id = b.id
      and rr.estado <> 'Cancelado'
    order by rr.created_at desc, rr.id desc
    limit 1
  ) r on true
  left join lateral (
    select coalesce(sum(i.monto), 0) as pagado_total
    from ingresos i
    where r.id is not null
      and i.reserva_id = r.id
      and i.estado = 'Pagado'
  ) ing on true
  left join lateral (
    select coalesce(sum(g.monto), 0) as gastos_total
    from gastos g
    where g.evento_id = b.id
      and g.estado = 'Pagado'
  ) gas on true
  left join lateral (
    select count(*) filter (where ep.estado in ('Pendiente','En camino'))::bigint as proveedores_pendientes,
           count(*)::bigint as proveedores_total
    from evento_proveedores ep
    where ep.evento_id = b.id
  ) prov on true
  left join lateral (
    select count(*) filter (where not ec.completado)::bigint as checklist_pendiente,
           count(*)::bigint as checklist_total
    from evento_checklist ec
    where ec.evento_id = b.id
  ) chk on true
  left join lateral (
    select count(*)::bigint as agenda_total
    from evento_agenda ea
    where ea.evento_id = b.id
  ) ag on true
  left join lateral (
    select count(*)::bigint as anexos_total
    from evento_anexos ex
    where ex.evento_id = b.id
  ) ax on true
  left join lateral (
    select count(*)::bigint as comentarios_total
    from evento_comentarios cc
    where cc.evento_id = b.id
  ) com on true
  left join lateral (
    select count(*)::bigint as platos_total
    from evento_platos ep
    where ep.evento_id = b.id
  ) pla on true
  left join lateral (
    select count(*)::bigint as decoraciones_total
    from evento_decoraciones ed
    where ed.evento_id = b.id
  ) dec on true
  where (p_pagos_pendientes is null or (p_pagos_pendientes = true and coalesce(r.saldo, 0) > 0) or (p_pagos_pendientes = false and coalesce(r.saldo, 0) = 0))
    and (p_saldo_pendiente is null or (p_saldo_pendiente = true and coalesce(r.saldo, 0) > 0) or (p_saldo_pendiente = false and coalesce(r.saldo, 0) = 0))
    and (p_sin_proveedor is null or (p_sin_proveedor = true and coalesce(prov.proveedores_total, 0) = 0) or (p_sin_proveedor = false and coalesce(prov.proveedores_total, 0) > 0))
    and (p_sin_reserva is null or (p_sin_reserva = true and r.id is null) or (p_sin_reserva = false and r.id is not null))
    and (p_checklist_incompleto is null or (p_checklist_incompleto = true and coalesce(chk.checklist_pendiente, 0) > 0) or (p_checklist_incompleto = false and coalesce(chk.checklist_pendiente, 0) = 0))
    and (p_con_anexos is null or (p_con_anexos = true and coalesce(ax.anexos_total, 0) > 0) or (p_con_anexos = false and coalesce(ax.anexos_total, 0) = 0))
    and (p_con_comentarios is null or (p_con_comentarios = true and coalesce(com.comentarios_total, 0) > 0) or (p_con_comentarios = false and coalesce(com.comentarios_total, 0) = 0))
    and (p_con_agenda is null or (p_con_agenda = true and coalesce(ag.agenda_total, 0) > 0) or (p_con_agenda = false and coalesce(ag.agenda_total, 0) = 0))
  order by b.fecha, b.hora nulls last, b.id;
$$;

create or replace function fn_calendario_evento_resumen(p_evento_id bigint)
returns table (
  id bigint,
  nombre text,
  fecha date,
  hora time,
  lugar text,
  estado text,
  invitados integer,
  presupuesto numeric,
  cliente_id bigint,
  cliente_nombre text,
  cliente_email text,
  cliente_telefono text,
  tipo_nombre text,
  tipo_color text,
  planificador_nombre text,
  reserva_id bigint,
  reserva_codigo text,
  reserva_estado text,
  reserva_total numeric,
  reserva_saldo numeric,
  pagado_total numeric,
  gastos_total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    e.id,
    e.nombre,
    e.fecha,
    e.hora,
    e.lugar,
    e.estado::text,
    e.invitados,
    e.presupuesto,
    c.id as cliente_id,
    c.nombre as cliente_nombre,
    c.email as cliente_email,
    c.telefono as cliente_telefono,
    te.nombre as tipo_nombre,
    te.color as tipo_color,
    p.nombre as planificador_nombre,
    r.id as reserva_id,
    r.codigo as reserva_codigo,
    r.estado::text as reserva_estado,
    coalesce(r.total, 0) as reserva_total,
    coalesce(r.saldo, 0) as reserva_saldo,
    coalesce(ing.pagado_total, 0) as pagado_total,
    coalesce(gas.gastos_total, 0) as gastos_total
  from eventos e
  join clientes c on c.id = e.cliente_id
  join tipos_evento te on te.id = e.tipo_evento_id
  left join perfiles p on p.id = e.planificador_id
  left join lateral (
    select *
    from reservas rr
    where rr.evento_id = e.id
      and rr.estado <> 'Cancelado'
    order by rr.created_at desc, rr.id desc
    limit 1
  ) r on true
  left join lateral (
    select coalesce(sum(i.monto), 0) as pagado_total
    from ingresos i
    where r.id is not null and i.reserva_id = r.id and i.estado = 'Pagado'
  ) ing on true
  left join lateral (
    select coalesce(sum(g.monto), 0) as gastos_total
    from gastos g
    where g.evento_id = e.id and g.estado = 'Pagado'
  ) gas on true
  where e.id = p_evento_id;
$$;

create or replace function fn_calendario_evento_proveedores(p_evento_id bigint)
returns table (
  id bigint,
  proveedor_id bigint,
  proveedor_nombre text,
  proveedor_tipo text,
  contacto text,
  telefono text,
  servicio_contratado text,
  costo numeric,
  estado text,
  notas text
)
language sql
stable
security invoker
set search_path = public
as $$
  select ep.id, p.id, p.nombre, p.tipo::text, p.contacto, p.telefono,
         ep.servicio_contratado, ep.costo, ep.estado::text, ep.notas
  from evento_proveedores ep
  join proveedores p on p.id = ep.proveedor_id
  where ep.evento_id = p_evento_id
  order by ep.id;
$$;

create or replace function fn_calendario_evento_checklist(p_evento_id bigint)
returns table (
  id bigint,
  descripcion text,
  completado boolean,
  completado_en timestamptz,
  orden smallint
)
language sql
stable
security invoker
set search_path = public
as $$
  select ec.id, ec.descripcion, ec.completado, ec.completado_en, ec.orden
  from evento_checklist ec
  where ec.evento_id = p_evento_id
  order by ec.completado, ec.orden, ec.id;
$$;

create or replace function fn_calendario_evento_agenda(p_evento_id bigint)
returns table (
  id bigint,
  hora_inicio time,
  hora_fin time,
  actividad text,
  proveedor_nombre text,
  notas text
)
language sql
stable
security invoker
set search_path = public
as $$
  select ea.id, ea.hora_inicio, ea.hora_fin, ea.actividad, pr.nombre, ea.notas
  from evento_agenda ea
  left join evento_proveedores ep on ep.id = ea.evento_proveedor_id
  left join proveedores pr on pr.id = ep.proveedor_id
  where ea.evento_id = p_evento_id
  order by ea.hora_inicio, ea.id;
$$;

create or replace function fn_calendario_evento_platos(p_evento_id bigint)
returns table (
  id bigint,
  plato_nombre text,
  categoria text,
  cantidad integer,
  precio_unitario numeric,
  subtotal numeric,
  notas text
)
language sql
stable
security invoker
set search_path = public
as $$
  select ep.id, p.nombre, p.categoria::text, ep.cantidad, ep.precio_unitario, ep.subtotal, ep.notas
  from evento_platos ep
  join platos p on p.id = ep.plato_id
  where ep.evento_id = p_evento_id
  order by p.nombre;
$$;

create or replace function fn_calendario_evento_decoraciones(p_evento_id bigint)
returns table (
  id bigint,
  decoracion_nombre text,
  tipo text,
  cantidad integer,
  costo_unitario numeric,
  subtotal numeric,
  notas text
)
language sql
stable
security invoker
set search_path = public
as $$
  select ed.id, d.nombre, d.tipo, ed.cantidad, ed.costo_unitario, ed.subtotal, ed.notas
  from evento_decoraciones ed
  join decoraciones d on d.id = ed.decoracion_id
  where ed.evento_id = p_evento_id
  order by d.nombre;
$$;

create or replace function fn_calendario_evento_comentarios(p_evento_id bigint)
returns table (
  id bigint,
  comentario text,
  created_at timestamptz,
  autor_nombre text
)
language sql
stable
security invoker
set search_path = public
as $$
  select ec.id, ec.comentario, ec.created_at, p.nombre
  from evento_comentarios ec
  left join perfiles p on p.id = ec.created_by
  where ec.evento_id = p_evento_id
  order by ec.created_at desc
  limit 10;
$$;

create or replace function fn_calendario_evento_historial(p_evento_id bigint)
returns table (
  id bigint,
  campo_modificado text,
  valor_anterior text,
  valor_nuevo text,
  modificado_en timestamptz,
  usuario_nombre text
)
language sql
stable
security invoker
set search_path = public
as $$
  select eh.id, eh.campo_modificado::text, eh.valor_anterior, eh.valor_nuevo, eh.modificado_en, p.nombre
  from evento_historial eh
  left join perfiles p on p.id = eh.modificado_por
  where eh.evento_id = p_evento_id
  order by eh.modificado_en desc
  limit 10;
$$;

create or replace function fn_calendario_evento_anexos(p_evento_id bigint)
returns table (
  id bigint,
  tipo text,
  nombre_archivo text,
  storage_path text,
  url text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select ex.id, ex.tipo, ex.nombre_archivo, ex.storage_path, ex.url, ex.created_at
  from evento_anexos ex
  where ex.evento_id = p_evento_id
  order by ex.created_at desc;
$$;

grant execute on function fn_calendario_eventos(date, date, text, bigint, bigint, bigint, uuid, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function fn_calendario_evento_resumen(bigint) to authenticated;
grant execute on function fn_calendario_evento_proveedores(bigint) to authenticated;
grant execute on function fn_calendario_evento_checklist(bigint) to authenticated;
grant execute on function fn_calendario_evento_agenda(bigint) to authenticated;
grant execute on function fn_calendario_evento_platos(bigint) to authenticated;
grant execute on function fn_calendario_evento_decoraciones(bigint) to authenticated;
grant execute on function fn_calendario_evento_comentarios(bigint) to authenticated;
grant execute on function fn_calendario_evento_historial(bigint) to authenticated;
grant execute on function fn_calendario_evento_anexos(bigint) to authenticated;
