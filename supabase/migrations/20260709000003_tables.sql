-- ============================================================================
-- Memory Events — 0003: Tablas
-- ============================================================================

-- 3.1 perfiles (1:1 con auth.users) -------------------------------------------
create table perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  rol         rol_usuario not null default 'Planificador',
  estado      estado_catalogo not null default 'Activo',
  cargo       text,
  telefono    text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3.2 tipos_evento -------------------------------------------------------------
create table tipos_evento (
  id          bigint generated always as identity primary key,
  nombre      text not null unique,
  color       text,
  icono       text,
  orden       smallint not null default 0,
  estado      estado_catalogo not null default 'Activo',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3.3 clientes ------------------------------------------------------------------
create table clientes (
  id                bigint generated always as identity primary key,
  planificador_id   uuid not null references perfiles(id) on delete restrict,
  nombre            text not null,
  tipo              tipo_cliente not null default 'Persona',
  email             text,
  telefono          text,
  direccion         text,
  fecha_nacimiento  date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references perfiles(id) on delete set null,
  updated_by        uuid references perfiles(id) on delete set null,
  constraint clientes_email_formato check (email is null or email = '' or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Una empresa no tiene fecha de nacimiento; solo aplica a clientes tipo Persona.
  constraint clientes_empresa_sin_nacimiento check (tipo = 'Persona' or fecha_nacimiento is null)
);

-- 3.4 proveedores ---------------------------------------------------------------
create table proveedores (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  tipo        tipo_proveedor not null default 'Otros',
  contacto    text,
  telefono    text,
  email       text,
  estado      estado_catalogo not null default 'Activo',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references perfiles(id) on delete set null,
  updated_by  uuid references perfiles(id) on delete set null
);

-- 3.5 platos ----------------------------------------------------------------------
create table platos (
  id                  bigint generated always as identity primary key,
  nombre              text not null,
  categoria           categoria_plato not null default 'Otros',
  descripcion         text,
  precio_referencial  numeric(10,2) check (precio_referencial is null or precio_referencial >= 0),
  estado              estado_catalogo not null default 'Activo',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 3.6 decoraciones ------------------------------------------------------------
create table decoraciones (
  id                  bigint generated always as identity primary key,
  nombre              text not null,
  tipo                text,
  descripcion         text,
  costo_referencial   numeric(10,2) check (costo_referencial is null or costo_referencial >= 0),
  estado              estado_catalogo not null default 'Activo',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 3.7 servicios -------------------------------------------------------------------
create table servicios (
  id                  bigint generated always as identity primary key,
  nombre              text not null,
  precio_referencial  numeric(10,2) check (precio_referencial is null or precio_referencial >= 0),
  estado              estado_catalogo not null default 'Activo',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 3.8 eventos ----------------------------------------------------------------------
create table eventos (
  id                bigint generated always as identity primary key,
  planificador_id   uuid not null references perfiles(id) on delete restrict,
  cliente_id        bigint not null references clientes(id) on delete restrict,
  tipo_evento_id    bigint not null references tipos_evento(id) on delete restrict,
  nombre            text not null,
  fecha             date not null,
  hora              time,
  lugar             text,
  invitados         integer check (invitados is null or invitados >= 0),
  estado            estado_evento not null default 'Pendiente',
  presupuesto       numeric(10,2) check (presupuesto is null or presupuesto >= 0),
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references perfiles(id) on delete set null,
  updated_by        uuid references perfiles(id) on delete set null
);

-- 3.9 evento_proveedores (N:M) -------------------------------------------------
create table evento_proveedores (
  id                  bigint generated always as identity primary key,
  evento_id           bigint not null references eventos(id) on delete cascade,
  proveedor_id        bigint not null references proveedores(id) on delete restrict,
  servicio_contratado text not null default '',
  costo               numeric(10,2) check (costo is null or costo >= 0),
  estado              estado_proveedor_evento not null default 'Pendiente',
  notas               text,
  created_at          timestamptz not null default now(),
  created_by          uuid references perfiles(id) on delete set null,
  unique (evento_id, proveedor_id, servicio_contratado)
);

-- 3.10 evento_platos (N:M) ------------------------------------------------------
create table evento_platos (
  id                bigint generated always as identity primary key,
  evento_id         bigint not null references eventos(id) on delete cascade,
  plato_id          bigint not null references platos(id) on delete restrict,
  cantidad          integer not null default 1 check (cantidad > 0),
  precio_unitario   numeric(10,2) not null check (precio_unitario >= 0),
  subtotal          numeric(10,2) generated always as (cantidad * precio_unitario) stored,
  notas             text,
  created_at        timestamptz not null default now(),
  created_by        uuid references perfiles(id) on delete set null,
  unique (evento_id, plato_id)
);

-- 3.11 evento_decoraciones (N:M) ------------------------------------------------
create table evento_decoraciones (
  id                bigint generated always as identity primary key,
  evento_id         bigint not null references eventos(id) on delete cascade,
  decoracion_id     bigint not null references decoraciones(id) on delete restrict,
  cantidad          integer not null default 1 check (cantidad > 0),
  costo_unitario    numeric(10,2) not null check (costo_unitario >= 0),
  subtotal          numeric(10,2) generated always as (cantidad * costo_unitario) stored,
  notas             text,
  created_at        timestamptz not null default now(),
  created_by        uuid references perfiles(id) on delete set null,
  unique (evento_id, decoracion_id)
);

-- 3.12 evento_anexos --------------------------------------------------------------
create table evento_anexos (
  id              bigint generated always as identity primary key,
  evento_id       bigint not null references eventos(id) on delete cascade,
  tipo            text not null check (tipo in ('imagen','video')),
  nombre_archivo  text,
  storage_path    text,
  url             text not null,
  created_at      timestamptz not null default now(),
  created_by      uuid references perfiles(id) on delete set null
);

-- 3.13 evento_historial -----------------------------------------------------------
create table evento_historial (
  id                bigint generated always as identity primary key,
  evento_id         bigint not null references eventos(id) on delete cascade,
  campo_modificado  campo_evento_auditado not null,
  valor_anterior    text,
  valor_nuevo       text,
  modificado_por    uuid references perfiles(id) on delete set null,
  modificado_en     timestamptz not null default now()
);

-- 3.14 evento_agenda ----------------------------------------------------------------
create table evento_agenda (
  id                    bigint generated always as identity primary key,
  evento_id             bigint not null references eventos(id) on delete cascade,
  hora_inicio           time not null,
  hora_fin              time,
  actividad             text not null,
  evento_proveedor_id   bigint references evento_proveedores(id) on delete set null,
  notas                 text,
  created_at            timestamptz not null default now(),
  created_by            uuid references perfiles(id) on delete set null
);

-- 3.15 evento_checklist ---------------------------------------------------------------
create table evento_checklist (
  id              bigint generated always as identity primary key,
  evento_id       bigint not null references eventos(id) on delete cascade,
  descripcion     text not null,
  completado      boolean not null default false,
  completado_en   timestamptz,
  completado_por  uuid references perfiles(id) on delete set null,
  orden           smallint not null default 0,
  created_at      timestamptz not null default now(),
  created_by      uuid references perfiles(id) on delete set null
);

-- 3.16 evento_comentarios ----------------------------------------------------------------
create table evento_comentarios (
  id           bigint generated always as identity primary key,
  evento_id    bigint not null references eventos(id) on delete cascade,
  comentario   text not null,
  created_at   timestamptz not null default now(),
  created_by   uuid references perfiles(id) on delete set null
);

-- 3.17 reservas -----------------------------------------------------------------------
create table reservas (
  id                bigint generated always as identity primary key,
  codigo            text not null unique,
  planificador_id   uuid not null references perfiles(id) on delete restrict,
  evento_id         bigint not null references eventos(id) on delete restrict,
  cliente_id        bigint not null references clientes(id) on delete restrict,
  fecha             date not null,
  estado            estado_reserva not null default 'Pendiente',
  total             numeric(10,2) not null default 0 check (total >= 0),
  adelanto          numeric(10,2) not null default 0 check (adelanto >= 0),
  saldo             numeric(10,2) not null default 0 check (saldo >= 0),
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references perfiles(id) on delete set null,
  updated_by        uuid references perfiles(id) on delete set null,
  -- El adelanto nunca puede superar el monto total contratado.
  constraint reservas_adelanto_no_excede_total check (adelanto <= total)
);
create sequence reservas_codigo_seq owned by reservas.codigo;

-- 3.18 reserva_servicios -----------------------------------------------------------
create table reserva_servicios (
  id                bigint generated always as identity primary key,
  reserva_id        bigint not null references reservas(id) on delete cascade,
  servicio_id       bigint references servicios(id) on delete set null,
  nombre            text not null,
  cantidad          integer not null default 1 check (cantidad > 0),
  precio_unitario   numeric(10,2) not null check (precio_unitario >= 0),
  subtotal          numeric(10,2) generated always as (cantidad * precio_unitario) stored,
  observaciones     text,
  created_at        timestamptz not null default now()
);

-- 3.19 ingresos ------------------------------------------------------------------------
create table ingresos (
  id                bigint generated always as identity primary key,
  codigo            text not null unique,
  planificador_id   uuid not null references perfiles(id) on delete restrict,
  reserva_id        bigint references reservas(id) on delete restrict,
  cliente_id        bigint not null references clientes(id) on delete restrict,
  concepto          text,
  monto             numeric(10,2) not null check (monto > 0),
  fecha             date not null,
  metodo            metodo_pago not null default 'Efectivo',
  estado            estado_pago not null default 'Pendiente',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references perfiles(id) on delete set null,
  updated_by        uuid references perfiles(id) on delete set null
);
create sequence ingresos_codigo_seq owned by ingresos.codigo;

-- 3.20 gastos ----------------------------------------------------------------------------
create table gastos (
  id                    bigint generated always as identity primary key,
  planificador_id       uuid not null references perfiles(id) on delete restrict,
  evento_id             bigint not null references eventos(id) on delete restrict,
  evento_proveedor_id   bigint references evento_proveedores(id) on delete set null,
  categoria             categoria_gasto not null default 'Otros',
  monto                 numeric(10,2) not null check (monto > 0),
  fecha                 date not null,
  metodo                metodo_pago not null default 'Efectivo',
  estado                estado_pago not null default 'Pagado',
  comprobante_url       text,
  descripcion           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references perfiles(id) on delete set null,
  updated_by            uuid references perfiles(id) on delete set null
);

-- 3.21 boletas ---------------------------------------------------------------------------
-- Documento inmutable una vez emitido (ver fn_proteger_boleta_inmutable en 0005/0006).
-- ingreso_id NO lleva UNIQUE aquí: puede haber varias boletas históricas Anuladas
-- para el mismo ingreso (una por cada corrección); la regla real de negocio —
-- "a lo sumo una boleta ACTIVA por ingreso" — se aplica con un índice único
-- parcial en 0004 (uq_boletas_ingreso_activa), no con una restricción de columna.
create table boletas (
  id                bigint generated always as identity primary key,
  numero            text not null unique,
  ingreso_id        bigint not null references ingresos(id) on delete restrict,
  planificador_id   uuid not null references perfiles(id) on delete restrict,
  cliente_id        bigint not null references clientes(id) on delete restrict,
  evento_id         bigint references eventos(id) on delete set null,
  reserva_id        bigint references reservas(id) on delete set null,
  fecha             timestamptz not null default now(),
  subtotal          numeric(10,2) not null default 0 check (subtotal >= 0),
  impuestos         numeric(10,2) not null default 0 check (impuestos >= 0),
  total             numeric(10,2) not null default 0 check (total >= 0),
  monto_pagado      numeric(10,2) not null default 0 check (monto_pagado >= 0),
  saldo_pendiente   numeric(10,2) not null default 0 check (saldo_pendiente >= 0),
  estado            estado_boleta not null default 'Emitida',
  anulado_en        timestamptz,
  anulado_por       uuid references perfiles(id) on delete set null,
  motivo_anulacion  text,
  created_by        uuid references perfiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  -- Defensa en profundidad: aunque el trigger de inmutabilidad ya garantiza esto
  -- en cada UPDATE, el CHECK protege también contra un INSERT directo inconsistente.
  constraint boletas_anulacion_consistente check (
    (estado = 'Emitida' and anulado_en is null and anulado_por is null)
    or
    (estado = 'Anulada' and anulado_en is not null and anulado_por is not null)
  )
);
create sequence boletas_numero_seq owned by boletas.numero;

-- 3.22 boleta_servicios -------------------------------------------------------------------
create table boleta_servicios (
  id               bigint generated always as identity primary key,
  boleta_id        bigint not null references boletas(id) on delete cascade,
  nombre           text not null,
  cantidad         integer not null default 1 check (cantidad > 0),
  precio_unitario  numeric(10,2) not null check (precio_unitario >= 0),
  subtotal         numeric(10,2) not null check (subtotal >= 0),
  observaciones    text
);

-- 3.23 notificaciones ----------------------------------------------------------------------
create table notificaciones (
  id                bigint generated always as identity primary key,
  destinatario_id   uuid not null references perfiles(id) on delete cascade,
  tipo              tipo_notificacion not null,
  titulo            text not null,
  cliente_id        bigint references clientes(id) on delete cascade,
  evento_id         bigint references eventos(id) on delete cascade,
  reserva_id        bigint references reservas(id) on delete cascade,
  ingreso_id        bigint references ingresos(id) on delete cascade,
  boleta_id         bigint references boletas(id) on delete cascade,
  leido             boolean not null default false,
  leido_at          timestamptz,
  created_at        timestamptz not null default now(),
  -- Al menos una referencia debe acompañar a la notificación (evita filas sin contexto).
  constraint notificaciones_tiene_referencia check (
    cliente_id is not null or evento_id is not null or reserva_id is not null
    or ingreso_id is not null or boleta_id is not null
  )
);

-- 3.24 configuracion_sistema (singleton) ----------------------------------------------------
create table configuracion_sistema (
  id                  smallint primary key default 1 check (id = 1),
  nombre_sistema      text not null default 'Memory',
  moneda              text not null default 'PEN',
  zona_horaria        text not null default 'America/Lima',
  razon_social        text,
  ruc                 text,
  telefono            text,
  email               text,
  direccion           text,
  web                 text,
  logo_url            text,
  logo_storage_path   text,
  updated_by          uuid references perfiles(id) on delete set null,
  updated_at          timestamptz not null default now()
);
