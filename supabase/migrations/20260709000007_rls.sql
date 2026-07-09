-- ============================================================================
-- Memory Events — 0007: Row Level Security
-- ============================================================================

-- 7.1 perfiles --------------------------------------------------------------------
-- Lectura abierta a cualquier autenticado (nombre/rol no son sensibles y hacen
-- falta para mostrar "creado por"/"planificador asignado" en toda la app).
-- Sin política de INSERT/DELETE: solo fn_handle_new_user (security definer)
-- puede crear filas; el borrado se hereda del ON DELETE CASCADE de auth.users.
alter table perfiles enable row level security;
create policy perfiles_select on perfiles for select using (true);
create policy perfiles_update on perfiles for update
  using (id = auth.uid() or es_administrador())
  with check (id = auth.uid() or es_administrador());

-- 7.2 catálogos compartidos (proveedores, platos, decoraciones, servicios) ---------
-- Lectura abierta; alta/edición: cualquier planificador o admin (aprobado en Fase 2).
do $$
declare t text;
begin
  foreach t in array array['proveedores','platos','decoraciones','servicios'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_select on %I for select using (true)', t, t);
    execute format('create policy %I_insert on %I for insert with check (auth.uid() is not null)', t, t);
    execute format('create policy %I_update on %I for update using (auth.uid() is not null) with check (auth.uid() is not null)', t, t);
    execute format('create policy %I_delete on %I for delete using (es_administrador())', t, t);
  end loop;
end $$;

-- 7.3 tipos_evento: lectura abierta, escritura solo administrador -----------------
alter table tipos_evento enable row level security;
create policy tipos_evento_select on tipos_evento for select using (true);
create policy tipos_evento_write on tipos_evento for all
  using (es_administrador()) with check (es_administrador());

-- 7.4 Tablas de negocio con ownership (planificador_id) ---------------------------
-- boletas queda fuera de este bucle: tiene su propio régimen (7.9), más
-- restrictivo, por ser un documento inmutable.
do $$
declare t text;
begin
  foreach t in array array['clientes','eventos','reservas','ingresos','gastos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_select on %I for select using (planificador_id = auth.uid() or es_administrador())', t, t);
    execute format('create policy %I_insert on %I for insert with check (planificador_id = auth.uid() or es_administrador())', t, t);
    execute format('create policy %I_update on %I for update using (planificador_id = auth.uid() or es_administrador()) with check (planificador_id = auth.uid() or es_administrador())', t, t);
    execute format('create policy %I_delete on %I for delete using (es_administrador())', t, t);
  end loop;
end $$;

-- 7.5 Tablas hijas de eventos, CRUD libre para el dueño del evento -----------------
-- evento_comentarios queda fuera de este bucle: es una bitácora append-only
-- (ver 7.6), no se edita ni se borra.
do $$
declare t text;
begin
  foreach t in array array['evento_proveedores','evento_platos','evento_decoraciones',
                            'evento_anexos','evento_agenda','evento_checklist'] loop
    execute format('alter table %I enable row level security', t);
    execute format($f$create policy %I_all on %I for all
      using (exists (select 1 from eventos e where e.id = %I.evento_id
                     and (e.planificador_id = auth.uid() or es_administrador())))
      with check (exists (select 1 from eventos e where e.id = %I.evento_id
                     and (e.planificador_id = auth.uid() or es_administrador())))$f$, t, t, t, t);
  end loop;
end $$;

-- 7.6 evento_comentarios: bitácora append-only -------------------------------------
-- Corrige una inconsistencia detectada en la revisión de DBA: el diseño
-- aprobado en Fase 2 dice explícitamente "no se editan, se agrega uno nuevo",
-- pero al implementarlo había quedado con política FOR ALL (permitía editar y
-- borrar). Se restringe a solo SELECT + INSERT, igual que evento_historial.
alter table evento_comentarios enable row level security;
create policy evento_comentarios_select on evento_comentarios for select
  using (exists (select 1 from eventos e where e.id = evento_comentarios.evento_id
                 and (e.planificador_id = auth.uid() or es_administrador())));
create policy evento_comentarios_insert on evento_comentarios for insert
  with check (exists (select 1 from eventos e where e.id = evento_comentarios.evento_id
                 and (e.planificador_id = auth.uid() or es_administrador())));

-- 7.7 evento_historial: solo lectura para el usuario; lo inserta el trigger -------
alter table evento_historial enable row level security;
create policy evento_historial_select on evento_historial for select
  using (exists (select 1 from eventos e where e.id = evento_historial.evento_id
                 and (e.planificador_id = auth.uid() or es_administrador())));
create policy evento_historial_insert on evento_historial for insert
  with check (exists (select 1 from eventos e where e.id = evento_historial.evento_id
                 and (e.planificador_id = auth.uid() or es_administrador())));

-- 7.8 reserva_servicios (protegida vía la reserva padre) --------------------------
alter table reserva_servicios enable row level security;
create policy reserva_servicios_all on reserva_servicios for all
  using (exists (select 1 from reservas r where r.id = reserva_servicios.reserva_id
                 and (r.planificador_id = auth.uid() or es_administrador())))
  with check (exists (select 1 from reservas r where r.id = reserva_servicios.reserva_id
                 and (r.planificador_id = auth.uid() or es_administrador())));

-- 7.9 boletas: documento inmutable --------------------------------------------------
-- Sin política de INSERT: solo fn_generar_boleta (security definer) puede crear
-- boletas; un usuario nunca inserta una fila aquí directamente. Sin política de
-- DELETE: una boleta nunca se borra, solo se anula (UPDATE, controlado además
-- por el trigger trg_proteger_boleta_inmutable que bloquea cualquier otro cambio,
-- sin excepción ni siquiera para administradores).
alter table boletas enable row level security;
create policy boletas_select on boletas for select
  using (planificador_id = auth.uid() or es_administrador());
create policy boletas_update on boletas for update
  using (planificador_id = auth.uid() or es_administrador())
  with check (planificador_id = auth.uid() or es_administrador());

-- 7.10 boleta_servicios: solo lectura; las inserta fn_generar_boleta -----------------
alter table boleta_servicios enable row level security;
create policy boleta_servicios_select on boleta_servicios for select
  using (exists (select 1 from boletas b where b.id = boleta_servicios.boleta_id
                 and (b.planificador_id = auth.uid() or es_administrador())));

-- 7.11 notificaciones -----------------------------------------------------------------
alter table notificaciones enable row level security;
create policy notificaciones_select on notificaciones for select
  using (destinatario_id = auth.uid() or es_administrador());
create policy notificaciones_insert on notificaciones for insert
  with check (destinatario_id = auth.uid() or es_administrador());
create policy notificaciones_update on notificaciones for update
  using (destinatario_id = auth.uid() or es_administrador())
  with check (destinatario_id = auth.uid() or es_administrador());

-- 7.12 configuracion_sistema: lectura abierta, escritura solo administrador ------
alter table configuracion_sistema enable row level security;
create policy config_select on configuracion_sistema for select using (true);
create policy config_update on configuracion_sistema for update
  using (es_administrador()) with check (es_administrador());
