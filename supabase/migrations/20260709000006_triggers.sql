-- ============================================================================
-- Memory Events — 0006: Triggers
-- ============================================================================

-- 6.1 Alta automática de perfil ------------------------------------------------
create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function fn_handle_new_user();

-- 6.2 Auditoría genérica --------------------------------------------------------
create trigger trg_audit_clientes    before insert or update on clientes    for each row execute function fn_set_audit_fields();
create trigger trg_audit_eventos     before insert or update on eventos     for each row execute function fn_set_audit_fields();
create trigger trg_audit_reservas    before insert or update on reservas    for each row execute function fn_set_audit_fields();
create trigger trg_audit_ingresos    before insert or update on ingresos    for each row execute function fn_set_audit_fields();
create trigger trg_audit_gastos      before insert or update on gastos      for each row execute function fn_set_audit_fields();
create trigger trg_audit_proveedores before insert or update on proveedores for each row execute function fn_set_audit_fields();

-- 6.3 updated_at simple para catálogos sin ownership -----------------------------
create trigger trg_touch_platos       before update on platos       for each row execute function fn_set_updated_at();
create trigger trg_touch_decoraciones before update on decoraciones for each row execute function fn_set_updated_at();
create trigger trg_touch_servicios    before update on servicios    for each row execute function fn_set_updated_at();
create trigger trg_touch_tipos_evento before update on tipos_evento for each row execute function fn_set_updated_at();

-- 6.4 Códigos correlativos atómicos ----------------------------------------------
create trigger trg_reservas_codigo before insert on reservas
for each row execute function fn_generar_codigo_reserva();

create trigger trg_ingresos_codigo before insert on ingresos
for each row execute function fn_generar_codigo_ingreso();

-- 6.5 Ownership denormalizado, siempre derivado del padre ------------------------
create trigger trg_reserva_cliente before insert or update of evento_id on reservas
for each row execute function fn_reserva_cliente_desde_evento();

create trigger trg_ingreso_planificador before insert or update of reserva_id on ingresos
for each row execute function fn_ingreso_planificador_desde_reserva();

create trigger trg_gasto_planificador before insert or update of evento_id on gastos
for each row execute function fn_gasto_planificador_desde_evento();

-- 6.6 Saldo de reserva sincronizado con los ingresos pagados ---------------------
create trigger trg_sync_saldo_reserva
after insert or update or delete on ingresos
for each row execute function fn_sync_saldo_reserva();

-- 6.7 Generación automática de boleta ---------------------------------------------
create trigger trg_generar_boleta
after insert or update on ingresos
for each row execute function fn_generar_boleta();

-- 6.8 Inmutabilidad de boletas emitidas --------------------------------------------
create trigger trg_proteger_boleta_inmutable
before update on boletas
for each row execute function fn_proteger_boleta_inmutable();

-- 6.9 Historial de cambios significativos de un evento -----------------------------
create trigger trg_historial_evento
after update on eventos
for each row execute function fn_registrar_historial_evento();

-- 6.10 Notificaciones automáticas ---------------------------------------------------
create trigger trg_notif_cliente after insert on clientes
for each row execute function fn_notificar_cliente_nuevo();

create trigger trg_notif_reserva after insert on reservas
for each row execute function fn_notificar_reserva_creada();

create trigger trg_notif_pago after insert on ingresos
for each row execute function fn_notificar_pago_registrado();

create trigger trg_notif_boleta after insert on boletas
for each row execute function fn_notificar_boleta_generada();

-- 6.11 Protección de rol/estado de perfiles -----------------------------------------
create trigger trg_proteger_rol_perfil before update on perfiles
for each row execute function fn_proteger_rol_perfil();

-- 6.12 Autocompletar checklist ------------------------------------------------------
create trigger trg_checklist_completado before update on evento_checklist
for each row execute function fn_checklist_completado();
