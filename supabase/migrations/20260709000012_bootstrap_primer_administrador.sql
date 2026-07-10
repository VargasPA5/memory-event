-- ============================================================================
-- Memory Events — 0012: Bootstrap seguro del primer Administrador
-- ============================================================================

-- Problema:
-- fn_handle_new_user() crea perfiles como Planificador, y
-- fn_proteger_rol_perfil() bloquea correctamente cambios de rol/estado cuando
-- el usuario autenticado no es Administrador. En una base recién instalada eso
-- deja al sistema sin una ruta legítima para promover el primer Administrador.
--
-- Solución:
-- Se agrega una RPC transaccional, de un solo uso lógico, para promover al
-- usuario autenticado actual únicamente si todavía no existe ningún
-- Administrador. El trigger de protección sigue activo y solo reconoce esta
-- ruta durante la transacción de bootstrap.

create or replace function fn_proteger_rol_perfil()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_es_bootstrap boolean;
begin
  if new.id is distinct from old.id then
    raise exception 'No se puede cambiar el identificador de un perfil';
  end if;

  if new.rol is distinct from old.rol or new.estado is distinct from old.estado then
    v_es_bootstrap :=
      current_setting('memory_events.bootstrap_primer_admin', true) = 'on'
      and auth.uid() = old.id
      and old.rol <> 'Administrador'
      and new.rol = 'Administrador'
      and new.estado = 'Activo'
      and not exists (
        select 1
        from perfiles
        where rol = 'Administrador'
      );

    if not (es_administrador() or v_es_bootstrap) then
      raise exception 'Solo un administrador puede cambiar el rol o el estado de un perfil';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function fn_bootstrap_primer_administrador()
returns perfiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_perfil perfiles%rowtype;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Debes iniciar sesión para inicializar el primer administrador';
  end if;

  -- Evita que dos sesiones simultáneas promuevan usuarios distintos cuando el
  -- sistema todavía no tiene administradores.
  perform pg_advisory_xact_lock(hashtext('memory_events.bootstrap_primer_administrador'));

  if exists (select 1 from perfiles where rol = 'Administrador') then
    raise exception 'El bootstrap ya fue utilizado: ya existe un administrador';
  end if;

  if not exists (select 1 from perfiles where id = v_uid) then
    raise exception 'El usuario autenticado no tiene un perfil asociado';
  end if;

  perform set_config('memory_events.bootstrap_primer_admin', 'on', true);

  update perfiles
  set rol = 'Administrador',
      estado = 'Activo'
  where id = v_uid
  returning * into v_perfil;

  perform set_config('memory_events.bootstrap_primer_admin', 'off', true);

  return v_perfil;
exception
  when others then
    perform set_config('memory_events.bootstrap_primer_admin', 'off', true);
    raise;
end;
$$;

revoke execute on function fn_bootstrap_primer_administrador() from public;
grant execute on function fn_bootstrap_primer_administrador() to authenticated;
