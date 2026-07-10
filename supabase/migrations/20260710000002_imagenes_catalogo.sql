-- ============================================================================
-- Memory Events — 0021: Imágenes para el catálogo (platos / decoraciones)
-- ============================================================================
-- Mismo patrón que configuracion_sistema.logo_url/logo_storage_path (0016):
-- un par de columnas nullable, sin default. Los registros existentes siguen
-- funcionando igual (imagen_url null = sin imagen, la UI cae al avatar de
-- iniciales que ya existe).

alter table platos       add column if not exists imagen_url         text;
alter table platos       add column if not exists imagen_storage_path text;
alter table decoraciones add column if not exists imagen_url         text;
alter table decoraciones add column if not exists imagen_storage_path text;

-- Bucket público único para ambos catálogos, separados por prefijo de carpeta
-- (catalogo/platos/... y catalogo/decoraciones/...), igual que `adjuntos`
-- separa por {evento_id}/. 5MB / solo imágenes — son miniaturas de catálogo,
-- no adjuntos de evento (que sí permiten video y pesan hasta 50MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- platos/decoraciones son catálogos compartidos (RLS: select abierto, insert/
-- update para cualquier autenticado, delete solo admin — ver 0007 §7.2). Las
-- imágenes siguen el mismo criterio: cualquier planificador autenticado puede
-- subir/reemplazar/quitar la imagen de un ítem del catálogo.
create policy catalogo_select on storage.objects for select
  using (bucket_id = 'catalogo');

create policy catalogo_insert on storage.objects for insert
  with check (bucket_id = 'catalogo' and auth.uid() is not null);

create policy catalogo_update on storage.objects for update
  using (bucket_id = 'catalogo' and auth.uid() is not null)
  with check (bucket_id = 'catalogo' and auth.uid() is not null);

create policy catalogo_delete on storage.objects for delete
  using (bucket_id = 'catalogo' and auth.uid() is not null);
