-- ============================================================================
-- Memory Events — Permitir eliminar gastos propios
-- ============================================================================
-- Gastos es un registro operativo del evento. A diferencia de boletas, no es un
-- documento fiscal inmutable. El Administrador mantiene acceso total y el
-- Planificador puede eliminar únicamente los gastos de sus propios eventos.

drop policy if exists gastos_delete on gastos;
create policy gastos_delete on gastos for delete
  using (planificador_id = auth.uid() or es_administrador());
