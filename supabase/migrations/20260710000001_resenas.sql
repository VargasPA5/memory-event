-- ============================================================================
-- Memory Events — 0020: Reseñas públicas de clientes
-- ============================================================================
-- Flujo: el planificador marca un evento como Realizado y, cuando quiere,
-- presiona "Solicitar reseña" en eventos.html. Eso llama a la Edge Function
-- solicitar-resena, que crea (o reutiliza) esta fila con un token aleatorio
-- y le manda al cliente un correo con un link público: resena.html?token=...
-- Esa página no requiere login — el cliente nunca tiene cuenta en el sistema.
-- Se publica automáticamente al enviarse (sin moderación, por decisión del
-- administrador del sistema).

create table resenas (
  id                bigint generated always as identity primary key,
  evento_id         bigint not null unique references eventos(id) on delete cascade,
  cliente_id        bigint not null references clientes(id) on delete cascade,
  planificador_id   uuid not null references perfiles(id) on delete restrict,
  token             text not null unique,
  estado            text not null default 'Pendiente' check (estado in ('Pendiente','Publicada')),
  calificacion      smallint check (calificacion between 1 and 5),
  comentario        text,
  nombre_mostrado   text,
  -- Denormalizado a propósito: la vitrina pública de index.html (rol anon)
  -- no tiene RLS para leer `eventos`, así que el nombre se copia aquí al
  -- crear la solicitud en vez de resolverlo con un join en cada carga.
  evento_nombre     text,
  enviado_en        timestamptz not null default now(),
  respondido_en     timestamptz,
  created_at        timestamptz not null default now(),
  -- Una reseña publicada siempre debe traer calificación y comentario.
  constraint resenas_publicada_completa check (
    estado = 'Pendiente' or (calificacion is not null and comentario is not null)
  )
);

create index idx_resenas_planificador on resenas(planificador_id);

alter table resenas enable row level security;

-- El planificador dueño (o un administrador) gestiona sus propias solicitudes.
create policy resenas_select_dueño on resenas for select
  using (planificador_id = auth.uid() or es_administrador());
create policy resenas_insert_dueño on resenas for insert
  with check (planificador_id = auth.uid() or es_administrador());
create policy resenas_update_dueño on resenas for update
  using (planificador_id = auth.uid() or es_administrador())
  with check (planificador_id = auth.uid() or es_administrador());
create policy resenas_delete_dueño on resenas for delete
  using (planificador_id = auth.uid() or es_administrador());

-- La página pública (index.html) solo puede leer las ya publicadas —
-- nunca la lista completa ni las que siguen pendientes de respuesta.
create policy resenas_select_publicas on resenas for select
  to anon
  using (estado = 'Publicada');

-- Grant acotado a columnas: aunque la policy ya filtra a solo 'Publicada',
-- esto evita que anon pueda pedir columnas internas (token, cliente_id,
-- planificador_id, evento_id) que no necesita para la vitrina pública.
grant select (calificacion, comentario, nombre_mostrado, evento_nombre, created_at, estado)
  on resenas to anon;

-- El formulario público (resena.html) no tiene sesión ni fila propia que
-- lo autorice por RLS: entra solo con el token de la URL, que funciona como
-- capacidad de un solo uso (igual que un link de reseteo de contraseña).
-- Por eso el acceso pasa por estas dos funciones security definer, no por
-- grants directos de INSERT/UPDATE a anon sobre la tabla.
create or replace function fn_resena_por_token(p_token text)
returns table (
  evento_nombre   text,
  evento_fecha    date,
  cliente_nombre  text,
  estado          text
)
language sql stable security definer set search_path = public as $$
  select e.nombre, e.fecha, c.nombre, r.estado
  from resenas r
  join eventos  e on e.id = r.evento_id
  join clientes c on c.id = r.cliente_id
  where r.token = p_token;
$$;

create or replace function fn_enviar_resena(
  p_token text,
  p_calificacion smallint,
  p_comentario text,
  p_nombre_mostrado text
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  if p_calificacion is null or p_calificacion < 1 or p_calificacion > 5 then
    raise exception 'La calificación debe estar entre 1 y 5';
  end if;
  if p_comentario is null or length(trim(p_comentario)) = 0 then
    raise exception 'El comentario es obligatorio';
  end if;

  select id into v_id from resenas where token = p_token and estado = 'Pendiente';
  if v_id is null then
    raise exception 'Este enlace ya no es válido o la reseña ya fue enviada';
  end if;

  update resenas set
    calificacion    = p_calificacion,
    comentario      = trim(p_comentario),
    nombre_mostrado = nullif(trim(coalesce(p_nombre_mostrado, '')), ''),
    estado          = 'Publicada',
    respondido_en   = now()
  where id = v_id;

  return true;
end;
$$;

grant execute on function fn_resena_por_token(text) to anon, authenticated;
grant execute on function fn_enviar_resena(text, smallint, text, text) to anon, authenticated;
