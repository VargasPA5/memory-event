-- ============================================================================
-- Memory Events — 0017: Supabase Storage — adjuntos de eventos
-- ============================================================================
-- Reemplaza el último uso restante de Firebase Storage: los anexos
-- (fotos/videos) de `evento_anexos` en eventos.html. Bucket público de
-- lectura (mismo criterio que 0016: las URLs ya eran efectivamente públicas
-- con Firebase, un download token no expira); escritura restringida por RLS
-- sobre storage.objects, validando contra la fila real de `eventos` — mismo
-- criterio de ownership que ya protege evento_anexos a nivel de tabla
-- (RLS 7.5: planificador_id = auth.uid() or es_administrador()).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'adjuntos', 'adjuntos', true, 52428800,
  array['image/*', 'video/*']
)
on conflict (id) do nothing;

-- Convención de ruta: {evento_id}/{timestamp}_{archivo} — el primer segmento
-- de la ruta identifica el evento dueño, igual que 'avatars' usa {uid}/...
create policy adjuntos_select on storage.objects for select
  using (bucket_id = 'adjuntos');

create policy adjuntos_insert on storage.objects for insert
  with check (
    bucket_id = 'adjuntos'
    and exists (
      select 1 from eventos e
      where e.id::text = (storage.foldername(name))[1]
        and (e.planificador_id = auth.uid() or es_administrador())
    )
  );

create policy adjuntos_delete on storage.objects for delete
  using (
    bucket_id = 'adjuntos'
    and exists (
      select 1 from eventos e
      where e.id::text = (storage.foldername(name))[1]
        and (e.planificador_id = auth.uid() or es_administrador())
    )
  );
