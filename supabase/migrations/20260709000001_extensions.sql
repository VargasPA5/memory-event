-- ============================================================================
-- Memory Events — 0001: Extensiones
-- ============================================================================

-- pg_trgm: búsqueda por similitud de texto (usada en el índice de clientes.nombre
-- para el buscador global, y en los índices de unicidad "sin duplicados casi
-- iguales" de los catálogos platos/decoraciones/servicios).
create extension if not exists pg_trgm;
