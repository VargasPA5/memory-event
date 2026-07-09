-- ============================================================================
-- Memory Events — 0004: Índices
-- ============================================================================

-- 4.1 perfiles ------------------------------------------------------------------
create index idx_perfiles_rol on perfiles(rol);
create index idx_perfiles_estado on perfiles(estado);

-- 4.2 clientes --------------------------------------------------------------------
create index idx_clientes_planificador on clientes(planificador_id);
create index idx_clientes_nombre_trgm on clientes using gin (nombre gin_trgm_ops);

-- 4.3 proveedores -----------------------------------------------------------------
create index idx_proveedores_tipo on proveedores(tipo);
create index idx_proveedores_estado on proveedores(estado);

-- 4.4 platos / decoraciones / servicios --------------------------------------------
-- Únicos por nombre normalizado (minúsculas, sin espacios extremos): evita que el
-- catálogo compartido se fragmente con "Pollo al horno" / "pollo al horno " /
-- "POLLO AL HORNO" como filas distintas, lo que rompería el reporte de "más
-- solicitado" al repartir el conteo entre variantes.
create index idx_platos_categoria on platos(categoria);
create unique index uq_platos_nombre on platos (lower(trim(nombre)));

create index idx_decoraciones_tipo on decoraciones(tipo);
create unique index uq_decoraciones_nombre on decoraciones (lower(trim(nombre)));

create unique index uq_servicios_nombre on servicios (lower(trim(nombre)));

-- 4.5 eventos -----------------------------------------------------------------------
-- idx_eventos_fecha se mantiene por separado (consultas admin "todos los eventos
-- por fecha" sin filtrar planificador); idx_eventos_planificador_fecha cubre el
-- caso — mucho más frecuente — "mis eventos ordenados/filtrados por fecha", y
-- también sirve para un filtro que sea solo por planificador_id (prefijo izquierdo),
-- por lo que ya no hace falta un índice separado de una sola columna planificador_id.
create index idx_eventos_planificador_fecha on eventos(planificador_id, fecha);
create index idx_eventos_fecha on eventos(fecha);
create index idx_eventos_cliente on eventos(cliente_id);
create index idx_eventos_estado on eventos(estado);
create index idx_eventos_tipo on eventos(tipo_evento_id);

-- 4.6 evento_proveedores --------------------------------------------------------------
create index idx_ep_evento on evento_proveedores(evento_id);
create index idx_ep_proveedor on evento_proveedores(proveedor_id);

-- 4.7 evento_platos -----------------------------------------------------------------
create index idx_evp_evento on evento_platos(evento_id);
create index idx_evp_plato on evento_platos(plato_id);

-- 4.8 evento_decoraciones -----------------------------------------------------------
create index idx_evd_evento on evento_decoraciones(evento_id);
create index idx_evd_decoracion on evento_decoraciones(decoracion_id);

-- 4.9 evento_anexos -------------------------------------------------------------------
create index idx_anexos_evento on evento_anexos(evento_id);

-- 4.10 evento_historial ----------------------------------------------------------------
create index idx_hist_evento on evento_historial(evento_id);
create index idx_hist_fecha on evento_historial(modificado_en desc);

-- 4.11 evento_agenda ----------------------------------------------------------------------
create index idx_agenda_evento on evento_agenda(evento_id, hora_inicio);
-- Faltaba: columna FK usada por "on delete set null" sin índice de soporte.
create index idx_agenda_evento_proveedor on evento_agenda(evento_proveedor_id);

-- 4.12 evento_checklist -------------------------------------------------------------------
create index idx_checklist_evento on evento_checklist(evento_id);

-- 4.13 evento_comentarios ------------------------------------------------------------------
create index idx_comentarios_evento on evento_comentarios(evento_id, created_at desc);

-- 4.14 reservas -----------------------------------------------------------------------------
create index idx_reservas_planificador_fecha on reservas(planificador_id, fecha);
create index idx_reservas_fecha on reservas(fecha);
create index idx_reservas_evento on reservas(evento_id);
create index idx_reservas_cliente on reservas(cliente_id);
create index idx_reservas_estado on reservas(estado);

-- 4.15 reserva_servicios --------------------------------------------------------------------
create index idx_rs_reserva on reserva_servicios(reserva_id);
create index idx_rs_servicio on reserva_servicios(servicio_id);

-- 4.16 ingresos -------------------------------------------------------------------------------
create index idx_ingresos_planificador_fecha on ingresos(planificador_id, fecha);
create index idx_ingresos_fecha on ingresos(fecha);
create index idx_ingresos_reserva on ingresos(reserva_id);
create index idx_ingresos_cliente on ingresos(cliente_id);
create index idx_ingresos_estado on ingresos(estado);
-- Parcial: soporta directamente el agregado "suma de pagos Pagados por reserva"
-- que ejecuta fn_sync_saldo_reserva en CADA insert/update/delete de ingresos.
create index idx_ingresos_reserva_pagado on ingresos(reserva_id) where estado = 'Pagado';

-- 4.17 gastos -----------------------------------------------------------------------------------
create index idx_gastos_planificador_fecha on gastos(planificador_id, fecha);
create index idx_gastos_fecha on gastos(fecha);
create index idx_gastos_evento on gastos(evento_id);
create index idx_gastos_categoria on gastos(categoria);
create index idx_gastos_estado on gastos(estado);
-- Faltaba: columna FK usada por "on delete set null" sin índice de soporte.
create index idx_gastos_evento_proveedor on gastos(evento_proveedor_id);

-- 4.18 boletas -------------------------------------------------------------------------------------
create index idx_boletas_planificador on boletas(planificador_id);
create index idx_boletas_cliente on boletas(cliente_id);
-- Faltaban: columnas FK usadas por "on delete set null" sin índice de soporte.
create index idx_boletas_evento on boletas(evento_id);
create index idx_boletas_reserva on boletas(reserva_id);
-- Historial completo (incluye anuladas) de boletas de un ingreso.
create index idx_boletas_ingreso on boletas(ingreso_id);
-- Regla de negocio real, no solo rendimiento: a lo sumo una boleta ACTIVA
-- (Emitida) por ingreso. Las anuladas no cuentan para esta unicidad, así que
-- una corrección puede anular la vieja y generar una nueva para el mismo pago.
create unique index uq_boletas_ingreso_activa on boletas(ingreso_id) where estado = 'Emitida';

-- 4.19 boleta_servicios -----------------------------------------------------------------------------
create index idx_bs_boleta on boleta_servicios(boleta_id);

-- 4.20 notificaciones -----------------------------------------------------------------------------------
create index idx_notif_destinatario on notificaciones(destinatario_id, leido);
create index idx_notif_fecha on notificaciones(created_at desc);
-- Faltaban las 5: columnas FK usadas por "on delete cascade" sin índice de soporte.
-- Sin esto, borrar cualquier cliente/evento/reserva/ingreso/boleta obliga a un
-- seq scan completo de notificaciones para resolver el cascade — y esta tabla
-- crece sin límite (nunca se purga), así que el problema empeora con el tiempo.
create index idx_notif_cliente on notificaciones(cliente_id);
create index idx_notif_evento on notificaciones(evento_id);
create index idx_notif_reserva on notificaciones(reserva_id);
create index idx_notif_ingreso on notificaciones(ingreso_id);
create index idx_notif_boleta on notificaciones(boleta_id);
