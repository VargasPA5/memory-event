-- Migración incremental: agrega los campos de impuesto y formato de fecha
-- que el módulo Configuración necesita y que configuracion_sistema todavía
-- no tenía (verificado contra 20260709000003_tables.sql antes de escribir
-- esto). No toca RLS, triggers ni índices existentes.

alter table configuracion_sistema
  add column if not exists porcentaje_impuesto numeric(5,2) not null default 0
    check (porcentaje_impuesto >= 0 and porcentaje_impuesto <= 100),
  add column if not exists formato_fecha text not null default 'DD/MM/YYYY'
    check (formato_fecha in ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'));
