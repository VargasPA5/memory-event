-- ============================================================================
-- Memory Events — 0019: RPCs de Reportes
-- ============================================================================
-- Funciones especializadas para el módulo Reportes. Todas son SECURITY INVOKER
-- para respetar RLS: Administrador ve el universo completo y Planificador solo
-- los registros permitidos por las políticas existentes.

create or replace function fn_reportes_finanzas_periodo(
  p_desde date default null,
  p_hasta date default null,
  p_tipo_evento_id bigint default null,
  p_limite integer default 10
)
returns table (
  clave text,
  titulo text,
  valor numeric,
  formato text,
  detalle text
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_desde date := coalesce(p_desde, date_trunc('year', current_date)::date);
  v_hasta date := coalesce(p_hasta, current_date);
begin
  return query
  select 'clientes', 'Clientes',
         count(distinct c.id)::numeric, 'numero',
         'Clientes con actividad en el periodo'
  from clientes c
  where (
    p_tipo_evento_id is null and c.created_at::date between v_desde and v_hasta
  ) or exists (
    select 1
    from eventos e
    where e.cliente_id = c.id
      and e.fecha between v_desde and v_hasta
      and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)
  )

  union all
  select 'eventos', 'Eventos',
         count(*)::numeric, 'numero',
         'Eventos programados en el periodo'
  from eventos e
  where e.fecha between v_desde and v_hasta
    and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)

  union all
  select 'ingresos_cobrados', 'Ingresos cobrados',
         coalesce(sum(i.monto), 0), 'moneda',
         'Ingresos pagados del periodo'
  from ingresos i
  left join reservas r on r.id = i.reserva_id
  left join eventos e on e.id = r.evento_id
  where i.fecha between v_desde and v_hasta
    and i.estado = 'Pagado'
    and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)

  union all
  select 'gastos_pagados', 'Gastos pagados',
         coalesce(sum(g.monto), 0), 'moneda',
         'Gastos pagados del periodo'
  from gastos g
  left join eventos e on e.id = g.evento_id
  where g.fecha between v_desde and v_hasta
    and g.estado = 'Pagado'
    and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)

  union all
  select 'utilidad', 'Utilidad estimada',
         (
           select coalesce(sum(i.monto), 0)
           from ingresos i
           left join reservas r on r.id = i.reserva_id
           left join eventos e on e.id = r.evento_id
           where i.fecha between v_desde and v_hasta
             and i.estado = 'Pagado'
             and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)
         ) - (
           select coalesce(sum(g.monto), 0)
           from gastos g
           left join eventos e on e.id = g.evento_id
           where g.fecha between v_desde and v_hasta
             and g.estado = 'Pagado'
             and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)
         ), 'moneda',
         'Ingresos cobrados menos gastos pagados'

  union all
  select 'por_cobrar', 'Por cobrar',
         coalesce(sum(r.saldo), 0), 'moneda',
         'Saldo pendiente de reservas activas'
  from reservas r
  left join eventos e on e.id = r.evento_id
  where r.fecha between v_desde and v_hasta
    and r.estado <> 'Cancelado'
    and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id);
end;
$$;

create or replace function fn_reportes_eventos_por_estado(
  p_desde date default null,
  p_hasta date default null,
  p_tipo_evento_id bigint default null,
  p_limite integer default 10
)
returns table (
  estado text,
  total bigint,
  porcentaje numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select e.estado::text as estado
    from eventos e
    where e.fecha between coalesce(p_desde, date_trunc('year', current_date)::date)
                      and coalesce(p_hasta, current_date)
      and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)
  ),
  tot as (select greatest(count(*), 1)::numeric as n from base)
  select b.estado, count(*)::bigint,
         round((count(*)::numeric / tot.n) * 100, 2)
  from base b, tot
  group by b.estado, tot.n
  order by count(*) desc
  limit greatest(coalesce(p_limite, 10), 1);
$$;

create or replace function fn_reportes_eventos_por_tipo(
  p_desde date default null,
  p_hasta date default null,
  p_tipo_evento_id bigint default null,
  p_limite integer default 10
)
returns table (
  tipo_evento_id bigint,
  tipo text,
  color text,
  eventos bigint,
  ingresos numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    te.id,
    te.nombre,
    te.color,
    count(distinct e.id)::bigint as eventos,
    coalesce(sum(i.monto) filter (where i.estado = 'Pagado'), 0)::numeric as ingresos
  from tipos_evento te
  left join eventos e on e.tipo_evento_id = te.id
    and e.fecha between coalesce(p_desde, date_trunc('year', current_date)::date)
                    and coalesce(p_hasta, current_date)
  left join reservas r on r.evento_id = e.id
  left join ingresos i on i.reserva_id = r.id
    and i.fecha between coalesce(p_desde, date_trunc('year', current_date)::date)
                    and coalesce(p_hasta, current_date)
  where te.estado = 'Activo'
    and (p_tipo_evento_id is null or te.id = p_tipo_evento_id)
  group by te.id, te.nombre, te.color
  having count(distinct e.id) > 0 or coalesce(sum(i.monto) filter (where i.estado = 'Pagado'), 0) > 0
  order by eventos desc, ingresos desc, te.nombre
  limit greatest(coalesce(p_limite, 10), 1);
$$;

create or replace function fn_reportes_gastos_categoria(
  p_desde date default null,
  p_hasta date default null,
  p_tipo_evento_id bigint default null,
  p_limite integer default 10
)
returns table (
  categoria text,
  cantidad bigint,
  total numeric,
  porcentaje numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select g.categoria::text as categoria, g.monto
    from gastos g
    left join eventos e on e.id = g.evento_id
    where g.fecha between coalesce(p_desde, date_trunc('year', current_date)::date)
                      and coalesce(p_hasta, current_date)
      and g.estado = 'Pagado'
      and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)
  ),
  tot as (select greatest(coalesce(sum(monto), 0), 1)::numeric as n from base)
  select b.categoria,
         count(*)::bigint,
         coalesce(sum(b.monto), 0)::numeric,
         round((coalesce(sum(b.monto), 0)::numeric / tot.n) * 100, 2)
  from base b, tot
  group by b.categoria, tot.n
  order by coalesce(sum(b.monto), 0) desc
  limit greatest(coalesce(p_limite, 10), 1);
$$;

create or replace function fn_reportes_top_clientes(
  p_desde date default null,
  p_hasta date default null,
  p_tipo_evento_id bigint default null,
  p_limite integer default 10
)
returns table (
  cliente_id bigint,
  cliente text,
  eventos bigint,
  ingresos numeric,
  boletas bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.nombre,
    count(distinct e.id)::bigint as eventos,
    coalesce(sum(i.monto) filter (where i.estado = 'Pagado'), 0)::numeric as ingresos,
    count(distinct b.id)::bigint as boletas
  from clientes c
  join ingresos i on i.cliente_id = c.id
    and i.fecha between coalesce(p_desde, date_trunc('year', current_date)::date)
                    and coalesce(p_hasta, current_date)
    and i.estado = 'Pagado'
  left join reservas r on r.id = i.reserva_id
  left join eventos e on e.id = r.evento_id
  left join boletas b on b.ingreso_id = i.id and b.estado = 'Emitida'
  where (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)
  group by c.id, c.nombre
  order by ingresos desc, eventos desc, c.nombre
  limit greatest(coalesce(p_limite, 10), 1);
$$;

create or replace function fn_reportes_boletas_periodo(
  p_desde date default null,
  p_hasta date default null,
  p_tipo_evento_id bigint default null,
  p_limite integer default 10
)
returns table (
  estado text,
  cantidad bigint,
  subtotal numeric,
  impuestos numeric,
  total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    b.estado::text,
    count(*)::bigint,
    coalesce(sum(b.subtotal), 0)::numeric,
    coalesce(sum(b.impuestos), 0)::numeric,
    coalesce(sum(b.total), 0)::numeric
  from boletas b
  left join eventos e on e.id = b.evento_id
  where b.fecha::date between coalesce(p_desde, date_trunc('year', current_date)::date)
                          and coalesce(p_hasta, current_date)
    and (p_tipo_evento_id is null or e.tipo_evento_id = p_tipo_evento_id)
  group by b.estado
  order by count(*) desc, b.estado::text
  limit greatest(coalesce(p_limite, 10), 1);
$$;

grant execute on function fn_reportes_finanzas_periodo(date, date, bigint, integer) to authenticated;
grant execute on function fn_reportes_eventos_por_estado(date, date, bigint, integer) to authenticated;
grant execute on function fn_reportes_eventos_por_tipo(date, date, bigint, integer) to authenticated;
grant execute on function fn_reportes_gastos_categoria(date, date, bigint, integer) to authenticated;
grant execute on function fn_reportes_top_clientes(date, date, bigint, integer) to authenticated;
grant execute on function fn_reportes_boletas_periodo(date, date, bigint, integer) to authenticated;
