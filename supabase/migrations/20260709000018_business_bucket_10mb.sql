-- ============================================================================
-- Memory Events — 0018: Ampliar límite de tamaño del bucket 'business' (logo)
-- ============================================================================
-- El logo institucional suele venir de diseño gráfico en alta resolución;
-- el límite original de 5MB (20260709000016) resultó insuficiente en la
-- práctica. Se sube a 10MB solo para este bucket — 'avatars' (5MB) y
-- 'adjuntos' (50MB) no cambian.
--
-- update, no insert ... on conflict: el bucket ya existe desde 0016, así
-- que un insert con on conflict do nothing no tocaría file_size_limit.

update storage.buckets
set file_size_limit = 10485760 -- 10 * 1024 * 1024
where id = 'business';
