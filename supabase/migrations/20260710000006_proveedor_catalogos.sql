-- ============================================================================
-- Memory Events — Catálogos ofrecidos por proveedor
-- ============================================================================
-- Relaciona proveedores con los platos/decoraciones que realmente ofrecen.
-- No modifica evento_platos ni evento_decoraciones: esas tablas siguen siendo
-- el registro histórico de lo finalmente asignado/contratado para cada evento.

create table if not exists proveedor_platos (
  id                  bigint generated always as identity primary key,
  proveedor_id        bigint not null references proveedores(id) on delete cascade,
  plato_id            bigint not null references platos(id) on delete restrict,
  precio_referencial  numeric(10,2) check (precio_referencial is null or precio_referencial >= 0),
  activo              boolean not null default true,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references perfiles(id) on delete set null,
  updated_by          uuid references perfiles(id) on delete set null,
  constraint uq_proveedor_platos unique (proveedor_id, plato_id)
);

create table if not exists proveedor_decoraciones (
  id                  bigint generated always as identity primary key,
  proveedor_id        bigint not null references proveedores(id) on delete cascade,
  decoracion_id       bigint not null references decoraciones(id) on delete restrict,
  costo_referencial   numeric(10,2) check (costo_referencial is null or costo_referencial >= 0),
  activo              boolean not null default true,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references perfiles(id) on delete set null,
  updated_by          uuid references perfiles(id) on delete set null,
  constraint uq_proveedor_decoraciones unique (proveedor_id, decoracion_id)
);

create index if not exists idx_proveedor_platos_proveedor on proveedor_platos(proveedor_id);
create index if not exists idx_proveedor_platos_plato on proveedor_platos(plato_id);
create index if not exists idx_proveedor_platos_activo on proveedor_platos(activo);
create index if not exists idx_proveedor_decoraciones_proveedor on proveedor_decoraciones(proveedor_id);
create index if not exists idx_proveedor_decoraciones_decoracion on proveedor_decoraciones(decoracion_id);
create index if not exists idx_proveedor_decoraciones_activo on proveedor_decoraciones(activo);

alter table evento_platos
  add column if not exists evento_proveedor_id bigint references evento_proveedores(id) on delete set null;

alter table evento_decoraciones
  add column if not exists evento_proveedor_id bigint references evento_proveedores(id) on delete set null;

create index if not exists idx_evp_evento_proveedor on evento_platos(evento_proveedor_id);
create index if not exists idx_evd_evento_proveedor on evento_decoraciones(evento_proveedor_id);

drop trigger if exists trg_audit_evento_proveedores on evento_proveedores;
create trigger trg_audit_evento_proveedores
before insert or update on evento_proveedores
for each row execute function fn_set_evento_detalle_created_by();

drop trigger if exists trg_audit_proveedor_platos on proveedor_platos;
create trigger trg_audit_proveedor_platos
before insert or update on proveedor_platos
for each row execute function fn_set_audit_fields();

drop trigger if exists trg_audit_proveedor_decoraciones on proveedor_decoraciones;
create trigger trg_audit_proveedor_decoraciones
before insert or update on proveedor_decoraciones
for each row execute function fn_set_audit_fields();

alter table proveedor_platos enable row level security;
alter table proveedor_decoraciones enable row level security;

drop policy if exists proveedor_platos_select on proveedor_platos;
create policy proveedor_platos_select on proveedor_platos for select
  using (auth.uid() is not null);

drop policy if exists proveedor_platos_insert on proveedor_platos;
create policy proveedor_platos_insert on proveedor_platos for insert
  with check (es_administrador());

drop policy if exists proveedor_platos_update on proveedor_platos;
create policy proveedor_platos_update on proveedor_platos for update
  using (es_administrador())
  with check (es_administrador());

drop policy if exists proveedor_platos_delete on proveedor_platos;
create policy proveedor_platos_delete on proveedor_platos for delete
  using (es_administrador());

drop policy if exists proveedor_decoraciones_select on proveedor_decoraciones;
create policy proveedor_decoraciones_select on proveedor_decoraciones for select
  using (auth.uid() is not null);

drop policy if exists proveedor_decoraciones_insert on proveedor_decoraciones;
create policy proveedor_decoraciones_insert on proveedor_decoraciones for insert
  with check (es_administrador());

drop policy if exists proveedor_decoraciones_update on proveedor_decoraciones;
create policy proveedor_decoraciones_update on proveedor_decoraciones for update
  using (es_administrador())
  with check (es_administrador());

drop policy if exists proveedor_decoraciones_delete on proveedor_decoraciones;
create policy proveedor_decoraciones_delete on proveedor_decoraciones for delete
  using (es_administrador());

grant select, insert, update, delete on proveedor_platos to authenticated;
grant select, insert, update, delete on proveedor_decoraciones to authenticated;
grant all on proveedor_platos to service_role;
grant all on proveedor_decoraciones to service_role;
grant usage, select on sequence proveedor_platos_id_seq to authenticated;
grant usage, select on sequence proveedor_decoraciones_id_seq to authenticated;

create or replace function fn_validar_evento_plato_proveedor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_proveedor_id bigint;
  v_evento_id bigint;
begin
  if new.evento_proveedor_id is null then
    return new;
  end if;

  select ep.proveedor_id, ep.evento_id
    into v_proveedor_id, v_evento_id
  from evento_proveedores ep
  where ep.id = new.evento_proveedor_id;

  if v_proveedor_id is null then
    raise exception 'El proveedor asignado al evento no existe';
  end if;

  if v_evento_id is distinct from new.evento_id then
    raise exception 'El proveedor seleccionado no pertenece a este evento';
  end if;

  if not exists (
    select 1
    from proveedor_platos pp
    where pp.proveedor_id = v_proveedor_id
      and pp.plato_id = new.plato_id
      and pp.activo = true
  ) then
    raise exception 'El plato seleccionado no está activo en el catálogo de este proveedor';
  end if;

  return new;
end;
$$;

create or replace function fn_validar_evento_decoracion_proveedor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_proveedor_id bigint;
  v_evento_id bigint;
begin
  if new.evento_proveedor_id is null then
    return new;
  end if;

  select ep.proveedor_id, ep.evento_id
    into v_proveedor_id, v_evento_id
  from evento_proveedores ep
  where ep.id = new.evento_proveedor_id;

  if v_proveedor_id is null then
    raise exception 'El proveedor asignado al evento no existe';
  end if;

  if v_evento_id is distinct from new.evento_id then
    raise exception 'El proveedor seleccionado no pertenece a este evento';
  end if;

  if not exists (
    select 1
    from proveedor_decoraciones pd
    where pd.proveedor_id = v_proveedor_id
      and pd.decoracion_id = new.decoracion_id
      and pd.activo = true
  ) then
    raise exception 'La decoración seleccionada no está activa en el catálogo de este proveedor';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_evento_plato_proveedor on evento_platos;
create trigger trg_validar_evento_plato_proveedor
before insert or update of evento_proveedor_id, plato_id, evento_id on evento_platos
for each row execute function fn_validar_evento_plato_proveedor();

drop trigger if exists trg_validar_evento_decoracion_proveedor on evento_decoraciones;
create trigger trg_validar_evento_decoracion_proveedor
before insert or update of evento_proveedor_id, decoracion_id, evento_id on evento_decoraciones
for each row execute function fn_validar_evento_decoracion_proveedor();

drop function if exists fn_calendario_evento_platos(bigint);
create or replace function fn_calendario_evento_platos(p_evento_id bigint)
returns table (
  id bigint,
  plato_nombre text,
  categoria text,
  cantidad integer,
  precio_unitario numeric,
  subtotal numeric,
  notas text,
  evento_proveedor_id bigint,
  proveedor_id bigint,
  proveedor_nombre text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ep.id,
    p.nombre,
    p.categoria::text,
    ep.cantidad,
    ep.precio_unitario,
    ep.subtotal,
    ep.notas,
    ep.evento_proveedor_id,
    evp.proveedor_id,
    pr.nombre
  from evento_platos ep
  join platos p on p.id = ep.plato_id
  left join evento_proveedores evp on evp.id = ep.evento_proveedor_id
  left join proveedores pr on pr.id = evp.proveedor_id
  where ep.evento_id = p_evento_id
  order by p.nombre;
$$;

drop function if exists fn_calendario_evento_decoraciones(bigint);
create or replace function fn_calendario_evento_decoraciones(p_evento_id bigint)
returns table (
  id bigint,
  decoracion_nombre text,
  tipo text,
  cantidad integer,
  costo_unitario numeric,
  subtotal numeric,
  notas text,
  evento_proveedor_id bigint,
  proveedor_id bigint,
  proveedor_nombre text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ed.id,
    d.nombre,
    d.tipo,
    ed.cantidad,
    ed.costo_unitario,
    ed.subtotal,
    ed.notas,
    ed.evento_proveedor_id,
    evp.proveedor_id,
    pr.nombre
  from evento_decoraciones ed
  join decoraciones d on d.id = ed.decoracion_id
  left join evento_proveedores evp on evp.id = ed.evento_proveedor_id
  left join proveedores pr on pr.id = evp.proveedor_id
  where ed.evento_id = p_evento_id
  order by d.nombre;
$$;

grant execute on function fn_calendario_evento_platos(bigint) to authenticated;
grant execute on function fn_calendario_evento_decoraciones(bigint) to authenticated;

create or replace function fn_actualizar_catalogo_proveedor(
  p_proveedor_id bigint,
  p_platos jsonb default '[]'::jsonb,
  p_decoraciones jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_proveedor_id is null then
    raise exception 'El proveedor es obligatorio';
  end if;

  if not exists (select 1 from proveedores where id = p_proveedor_id) then
    raise exception 'El proveedor no existe';
  end if;

  delete from proveedor_platos where proveedor_id = p_proveedor_id;

  insert into proveedor_platos (
    proveedor_id, plato_id, precio_referencial, activo, notas
  )
  select
    p_proveedor_id,
    (item->>'plato_id')::bigint,
    nullif(item->>'precio_referencial', '')::numeric,
    coalesce((item->>'activo')::boolean, true),
    nullif(btrim(coalesce(item->>'notas', '')), '')
  from jsonb_array_elements(coalesce(p_platos, '[]'::jsonb)) as item
  where nullif(item->>'plato_id', '') is not null
  on conflict (proveedor_id, plato_id) do update
    set precio_referencial = excluded.precio_referencial,
        activo = excluded.activo,
        notas = excluded.notas,
        updated_at = now(),
        updated_by = auth.uid();

  delete from proveedor_decoraciones where proveedor_id = p_proveedor_id;

  insert into proveedor_decoraciones (
    proveedor_id, decoracion_id, costo_referencial, activo, notas
  )
  select
    p_proveedor_id,
    (item->>'decoracion_id')::bigint,
    nullif(item->>'costo_referencial', '')::numeric,
    coalesce((item->>'activo')::boolean, true),
    nullif(btrim(coalesce(item->>'notas', '')), '')
  from jsonb_array_elements(coalesce(p_decoraciones, '[]'::jsonb)) as item
  where nullif(item->>'decoracion_id', '') is not null
  on conflict (proveedor_id, decoracion_id) do update
    set costo_referencial = excluded.costo_referencial,
        activo = excluded.activo,
        notas = excluded.notas,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

grant execute on function fn_actualizar_catalogo_proveedor(bigint, jsonb, jsonb) to authenticated;
