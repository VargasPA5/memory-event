-- ============================================================================
-- Memory Events — 0022: Sube el límite del bucket `catalogo` a 10MB
-- ============================================================================
-- Mismo ajuste que 0018 hizo para `business` (logo): el límite de 5MB se
-- quedaba corto para fotos reales de celular sin comprimir.

update storage.buckets set file_size_limit = 10485760 where id = 'catalogo';
