-- ============================================================================
-- Memory Events — 0002: Enums
-- ============================================================================

create type rol_usuario as enum ('Administrador','Planificador');
create type tipo_cliente as enum ('Persona','Empresa');
create type estado_catalogo as enum ('Activo','Inactivo');
create type estado_evento as enum ('Pendiente','Confirmado','Realizado','Cancelado');
create type estado_proveedor_evento as enum ('Pendiente','Confirmado','En camino','Finalizado','Cancelado');
create type estado_reserva as enum ('Pendiente','Confirmado','Cancelado');
create type metodo_pago as enum ('Efectivo','Transferencia','Tarjeta','Yape/Plin');
create type estado_pago as enum ('Pagado','Pendiente','Anulado');
create type categoria_plato as enum ('Entrada','Plato principal','Postre','Bebida','Otros');
create type categoria_gasto as enum (
  'Catering','Decoración','Fotografía/Filmación','Música/Sonido','Transporte',
  'Mobiliario','Viáticos','Papelería','Caja chica','Combustible','Otros'
);
create type tipo_proveedor as enum (
  'Decoración','Catering','Música','Fotografía','Coordinación',
  'Transporte','Mobiliario','Sonido/Iluminación','Otros'
);
create type tipo_notificacion as enum ('reserva_creada','pago_registrado','boleta_generada','cliente_nuevo');
create type campo_evento_auditado as enum ('fecha','lugar','estado','presupuesto','planificador_id');
create type estado_boleta as enum ('Emitida','Anulada');
