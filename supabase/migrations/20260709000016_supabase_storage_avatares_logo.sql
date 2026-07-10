-- ============================================================================
-- Memory Events — 0016: Supabase Storage — avatares y logo del sistema
-- ============================================================================
-- Reemplaza Firebase Storage para estos dos flujos (avatar de usuario y logo
-- del sistema). Buckets públicos de lectura — los avatares y el logo se
-- pintan en <img> incluso sin sesión (sidebar, topbar, login), igual que
-- antes con las URLs de descarga de Firebase — con escritura restringida por
-- RLS sobre storage.objects, mismo patrón de ownership que el resto del
-- proyecto (propietario por carpeta / es_administrador()).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('business', 'business', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- storage.objects ya tiene RLS activo por defecto en todo proyecto Supabase
-- y pertenece a supabase_storage_admin, no al rol de este SQL Editor/CLI:
-- intentar volver a habilitarlo aquí falla con "must be owner of table
-- objects" (42501). Basta con crear las políticas directamente.

-- 16.1 avatars: cada usuario administra únicamente su propia carpeta
-- {auth.uid()}/archivo — igual convención de rutas que usaba Firebase
-- (avatars/{uid}/...), solo que aquí el uid es el primer segmento del
-- nombre de objeto dentro del bucket, no un prefijo del bucket.
create policy avatars_select on storage.objects for select
  using (bucket_id = 'avatars');

create policy avatars_insert on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 16.2 business (logo del sistema): solo Administrador escribe, igual regla
-- que ya protege configuracion_sistema (config_update, RLS 7.12). -------------
create policy business_select on storage.objects for select
  using (bucket_id = 'business');

create policy business_write on storage.objects for all
  using (bucket_id = 'business' and es_administrador())
  with check (bucket_id = 'business' and es_administrador());
