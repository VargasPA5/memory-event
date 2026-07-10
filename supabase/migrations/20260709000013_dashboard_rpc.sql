-- ============================================================================
-- Memory Events — 0013: RPCs de Dashboard
-- ============================================================================
-- RPCs pequeñas y especializadas para alimentar el Dashboard sin calcular
-- métricas de negocio en el frontend. Todas son SECURITY INVOKER para respetar
-- RLS: Administrador ve el universo completo y Planificador solo sus registros.

create or replace function fn_dashboard_kpis(
  p_desde date default null,
  p_hasta date default null
)
returns table (
  clave text,
  titulo text,
  valor numeric,
  formato text,
  detalle text,
  grupo text
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_desde date := coalesce(p_desde, date_trunc('month', current_date)::date);
  v_hasta date := coalesce(p_hasta, current_date);
begin
  return query
  select 'eventos_proximos', 'Eventos próximos',
         count(*)::numeric, 'numero',
         'Próximos 30 días', 'operativo'
  from eventos e
  where e.fecha between current_date and current_date + 30
    and e.estado <> 'Cancelado'

  union all
  select 'reservas_confirmadas', 'Reservas confirmadas',
         count(*)::numeric, 'numero',
         'En el periodo seleccionado', 'operativo'
  from reservas r
  where r.fecha between v_desde and v_hasta
    and r.estado = 'Confirmado'

  union all
  select 'ingresos_cobrados', 'Ingresos cobrados',
         coalesce(sum(i.monto), 0), 'moneda',
         'Pagos en estado Pagado', 'financiero'
  from ingresos i
  where i.fecha between v_desde and v_hasta
    and i.estado = 'Pagado'

  union all
  select 'gastos_pagados', 'Gastos pagados',
         coalesce(sum(g.monto), 0), 'moneda',
         'Gastos pagados del periodo', 'financiero'
  from gastos g
  where g.fecha between v_desde and v_hasta
    and g.estado = 'Pagado'

  union all
  select 'utilidad_estimada', 'Utilidad estimada',
         (
           select coalesce(sum(i.monto), 0)
           from ingresos i
           where i.fecha between v_desde and v_hasta
             and i.estado = 'Pagado'
         ) - (
           select coalesce(sum(g.monto), 0)
           from gastos g
           where g.fecha between v_desde and v_hasta
             and g.estado = 'Pagado'
         ), 'moneda',
         'Ingresos cobrados menos gastos pagados', 'financiero'

  union all
  select 'saldo_pendiente', 'Saldo pendiente',
         coalesce(sum(r.saldo), 0), 'moneda',
         'Saldo abierto en reservas activas', 'financiero'
  from reservas r
  where r.estado <> 'Cancelado'

  union all
  select 'clientes_nuevos', 'Clientes nuevos',
         count(*)::numeric, 'numero',
         'Altas del periodo seleccionado', 'comercial'
  from clientes c
  where c.created_at::date between v_desde and v_hasta

  union all
  select 'boletas_emitidas', 'Boletas emitidas',
         count(*)::numeric, 'numero',
         'Documentos emitidos del periodo', 'financiero'
  from boletas b
  where b.fecha::date between v_desde and v_hasta
    and b.estado = 'Emitida';
end;
$$;

create or replace function fn_dashboard_finanzas_mensuales(
  p_meses integer default 6
)
returns table (
  periodo date,
  etiqueta text,
  ingresos numeric,
  gastos numeric,
  utilidad numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with meses as (
    select generate_series(
      date_trunc('month', current_date)::date - ((greatest(p_meses, 1) - 1) * interval '1 month'),
      date_trunc('month', current_date)::date,
      interval '1 month'
    )::date as periodo
  ),
  ingresos_mes as (
    select date_trunc('month', fecha)::date as periodo, sum(monto) as total
    from ingresos
    where estado = 'Pagado'
      and fecha >= (select min(periodo) from meses)
      and fecha < ((select max(periodo) from meses) + interval '1 month')::date
    group by 1
  ),
  gastos_mes as (
    select date_trunc('month', fecha)::date as periodo, sum(monto) as total
    from gastos
    where estado = 'Pagado'
      and fecha >= (select min(periodo) from meses)
      and fecha < ((select max(periodo) from meses) + interval '1 month')::date
    group by 1
  )
  select
    m.periodo,
    initcap(to_char(m.periodo, 'TMMon')) as etiqueta,
    coalesce(i.total, 0) as ingresos,
    coalesce(g.total, 0) as gastos,
    coalesce(i.total, 0) - coalesce(g.total, 0) as utilidad
  from meses m
  left join ingresos_mes i using (periodo)
  left join gastos_mes g using (periodo)
  order by m.periodo;
$$;

create or replace function fn_dashboard_reservas_estado(
  p_desde date default null,
  p_hasta date default null
)
returns table (
  estado text,
  total bigint,
  monto_total numeric,
  saldo_total numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_desde date := coalesce(p_desde, date_trunc('month', current_date)::date);
  v_hasta date := coalesce(p_hasta, current_date);
begin
  return query
  select
    r.estado::text,
    count(*)::bigint,
    coalesce(sum(r.total), 0),
    coalesce(sum(r.saldo), 0)
  from reservas r
  where r.fecha between v_desde and v_hasta
  group by r.estado
  order by r.estado;
end;
$$;

create or replace function fn_dashboard_eventos_proximos(
  p_limite integer default 6
)
returns table (
  id bigint,
  nombre text,
  fecha date,
  hora time,
  lugar text,
  estado text,
  cliente_nombre text,
  tipo_nombre text,
  tipo_color text,
  planificador_nombre text,
  reserva_codigo text,
  reserva_saldo numeric
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
    c.nombre as cliente_nombre,
    te.nombre as tipo_nombre,
    te.color as tipo_color,
    p.nombre as planificador_nombre,
    r.codigo as reserva_codigo,
    r.saldo as reserva_saldo
  from eventos e
  join clientes c on c.id = e.cliente_id
  join tipos_evento te on te.id = e.tipo_evento_id
  left join perfiles p on p.id = e.planificador_id
  left join reservas r on r.evento_id = e.id and r.estado <> 'Cancelado'
  where e.fecha >= current_date
    and e.estado <> 'Cancelado'
  order by e.fecha, e.hora nulls last, e.id
  limit greatest(p_limite, 1);
$$;

create or replace function fn_dashboard_reservas_recientes(
  p_limite integer default 5
)
returns table (
  id bigint,
  codigo text,
  fecha date,
  estado text,
  total numeric,
  saldo numeric,
  cliente_nombre text,
  evento_nombre text,
  evento_fecha date
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id,
    r.codigo,
    r.fecha,
    r.estado::text,
    r.total,
    r.saldo,
    c.nombre as cliente_nombre,
    e.nombre as evento_nombre,
    e.fecha as evento_fecha
  from reservas r
  join clientes c on c.id = r.cliente_id
  join eventos e on e.id = r.evento_id
  order by r.created_at desc, r.id desc
  limit greatest(p_limite, 1);
$$;

create or replace function fn_dashboard_actividad_reciente(
  p_limite integer default 12
)
returns table (
  fecha timestamptz,
  tipo text,
  titulo text,
  detalle text,
  destino text
)
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from (
    select
      n.created_at as fecha,
      n.tipo::text as tipo,
      n.titulo as titulo,
      case
        when n.boleta_id is not null then 'Boleta'
        when n.ingreso_id is not null then 'Ingreso'
        when n.reserva_id is not null then 'Reserva'
        when n.evento_id is not null then 'Evento'
        when n.cliente_id is not null then 'Cliente'
        else 'Actividad'
      end as detalle,
      case
        when n.boleta_id is not null or n.ingreso_id is not null then 'ingresos.html'
        when n.reserva_id is not null then 'reservas.html'
        when n.evento_id is not null then 'eventos.html'
        when n.cliente_id is not null then 'clientes.html'
        else 'dashboard.html'
      end as destino
    from notificaciones n

    union all

    select
      h.modificado_en as fecha,
      'evento_actualizado' as tipo,
      'Evento actualizado: ' || e.nombre as titulo,
      h.campo_modificado::text || ': ' || coalesce(h.valor_anterior, '—') || ' → ' || coalesce(h.valor_nuevo, '—') as detalle,
      'eventos.html' as destino
    from evento_historial h
    join eventos e on e.id = h.evento_id

    union all

    select
      i.created_at as fecha,
      'pago_registrado' as tipo,
      'Pago registrado: ' || i.codigo as titulo,
      'S/ ' || i.monto::text || ' · ' || c.nombre as detalle,
      'ingresos.html' as destino
    from ingresos i
    join clientes c on c.id = i.cliente_id
    where i.estado = 'Pagado'
  ) actividad
  order by fecha desc
  limit greatest(p_limite, 1);
$$;

create or replace function fn_dashboard_clientes_resumen(
  p_desde date default null,
  p_hasta date default null
)
returns table (
  clave text,
  etiqueta text,
  valor numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_desde date := coalesce(p_desde, date_trunc('month', current_date)::date);
  v_hasta date := coalesce(p_hasta, current_date);
begin
  return query
  select 'total', 'Clientes totales', count(*)::numeric from clientes
  union all
  select 'nuevos_periodo', 'Clientes nuevos', count(*)::numeric
  from clientes
  where created_at::date between v_desde and v_hasta
  union all
  select 'personas', 'Personas', count(*)::numeric
  from clientes
  where tipo = 'Persona'
  union all
  select 'empresas', 'Empresas', count(*)::numeric
  from clientes
  where tipo = 'Empresa';
end;
$$;

grant execute on function fn_dashboard_kpis(date, date) to authenticated;
grant execute on function fn_dashboard_finanzas_mensuales(integer) to authenticated;
grant execute on function fn_dashboard_reservas_estado(date, date) to authenticated;
grant execute on function fn_dashboard_eventos_proximos(integer) to authenticated;
grant execute on function fn_dashboard_reservas_recientes(integer) to authenticated;
grant execute on function fn_dashboard_actividad_reciente(integer) to authenticated;
grant execute on function fn_dashboard_clientes_resumen(date, date) to authenticated;
