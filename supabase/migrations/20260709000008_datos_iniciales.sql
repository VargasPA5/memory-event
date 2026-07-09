-- ============================================================================
-- Memory Events — 0008: Datos iniciales
-- ============================================================================
-- Estos son datos de referencia indispensables (no datos de prueba): sin al
-- menos un tipo de evento, ningún evento puede crearse (tipo_evento_id es
-- NOT NULL). Por eso viven en una migración versionada y no en supabase/seed.sql
-- (que el CLI de Supabase solo aplica en desarrollo local, nunca en producción).

insert into tipos_evento (nombre, color, icono, orden) values
  ('Boda',          '#c9a35a', 'ring',       1),
  ('Cumpleaños',    '#f59e0b', 'cake',       2),
  ('Corporativo',   '#3b82f6', 'briefcase',  3),
  ('Graduación',    '#10b981', 'cap',        4),
  ('Quinceañero',   '#ec4899', 'crown',      5),
  ('Baby Shower',   '#60a5fa', 'baby',       6),
  ('Bautizo',       '#a78bfa', 'drop',       7),
  ('Conferencia',   '#6366f1', 'presentation',8),
  ('Festival',      '#f97316', 'sparkles',   9),
  ('Otros',         '#9ca3af', 'dots',       99)
on conflict (nombre) do nothing;

insert into configuracion_sistema (id) values (1) on conflict (id) do nothing;
