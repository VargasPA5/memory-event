/* ── platosService.js ───────────────────────────────────────────────────────
   Capa de acceso a datos para el catálogo `platos` en Supabase.

   La tabla es un catálogo compartido:
   - SELECT abierto por RLS.
   - INSERT/UPDATE para usuarios autenticados.
   - DELETE solo Administrador.
   - updated_at lo mantiene el trigger `trg_touch_platos`.                 */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[platosService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const _limpiar = (campos = {}, parcial = false) => {
  const { id, created_at, updated_at, ...permitidos } = campos;
  const payload = {};

  if (!parcial || 'nombre' in permitidos) payload.nombre = permitidos.nombre;
  if (!parcial || 'categoria' in permitidos) payload.categoria = permitidos.categoria || 'Otros';
  if (!parcial || 'descripcion' in permitidos) payload.descripcion = permitidos.descripcion || null;
  if (!parcial || 'precio_referencial' in permitidos) {
    payload.precio_referencial = permitidos.precio_referencial === '' || permitidos.precio_referencial == null
      ? null
      : Number(permitidos.precio_referencial);
  }
  if (!parcial || 'estado' in permitidos) payload.estado = permitidos.estado || 'Activo';
  if (!parcial || 'imagen_url' in permitidos) payload.imagen_url = permitidos.imagen_url ?? null;
  if (!parcial || 'imagen_storage_path' in permitidos) payload.imagen_storage_path = permitidos.imagen_storage_path ?? null;

  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

export const getAll = async (filtros = {}) => {
  let query = supabase
    .from('platos')
    .select('id, nombre, categoria, descripcion, precio_referencial, estado, imagen_url, created_at, updated_at')
    .order('nombre');

  if (filtros.categoria) query = query.eq('categoria', filtros.categoria);
  if (filtros.estado) query = query.eq('estado', filtros.estado);

  const { data, error } = await query;
  if (error) return { data: null, error: _err(error, 'getAll') };
  return { data, error: null };
};

export const getById = async (id) => {
  const { data, error } = await supabase
    .from('platos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: _err(error, `getById(${id})`) };
  return { data, error: null };
};

export const crear = async (campos) => {
  const payload = _limpiar(campos);

  const { data, error } = await supabase
    .from('platos')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, 'crear') };
  return { data, error: null };
};

export const actualizar = async (id, cambios) => {
  const payload = _limpiar(cambios, true);

  const { data, error } = await supabase
    .from('platos')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `actualizar(${id})`) };
  return { data, error: null };
};

export const eliminar = async (id) => {
  const { error } = await supabase
    .from('platos')
    .delete()
    .eq('id', id);

  if (error) return { data: null, error: _err(error, `eliminar(${id})`) };
  return { data: true, error: null };
};

export const buscar = async (query) => {
  if (!query || query.trim().length < 2) return { data: [], error: null };

  const q = query.trim();
  const { data, error } = await supabase
    .from('platos')
    .select('id, nombre, categoria, descripcion, precio_referencial, estado')
    .or(`nombre.ilike.%${q}%,descripcion.ilike.%${q}%`)
    .limit(20);

  if (error) return { data: null, error: _err(error, `buscar("${q}")`) };
  return { data, error: null };
};

export const cambiarEstado = async (id, estado) => {
  if (!['Activo', 'Inactivo'].includes(estado)) {
    return { data: null, error: 'Estado inválido' };
  }
  return actualizar(id, { estado });
};

/* ── Imagen del plato (Supabase Storage, bucket público `catalogo`) ───────
   Un plato = una imagen a la vez (se reemplaza, no se acumula), por eso
   sigue el mismo patrón que configuracionService.subirLogo: sube el archivo
   nuevo, guarda su URL en la fila y recién después borra el archivo
   anterior (si había uno) — nunca al revés, para no dejar la fila apuntando
   a un archivo que ya no existe si algo falla a mitad de camino. */
const CATALOGO_BUCKET = 'catalogo';
const MAX_IMAGEN_MB = 10;
const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Sube la imagen de un plato ya existente (con id) y actualiza la fila.
 * @param {number} id
 * @param {File} file
 * @param {string|null} pathAnterior — imagen_storage_path previo, si lo había
 */
export const subirImagen = async (id, file, pathAnterior) => {
  if (!TIPOS_IMAGEN_PERMITIDOS.includes(file.type)) {
    return { data: null, error: 'Solo se permiten imágenes JPG, PNG o WebP' };
  }
  if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    return { data: null, error: `La imagen no debe superar ${MAX_IMAGEN_MB}MB (tu archivo pesa ${mb}MB)` };
  }

  const path = `platos/${id}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(CATALOGO_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) return { data: null, error: _err(uploadError, 'subirImagen.upload') };

  const { data: pub } = supabase.storage.from(CATALOGO_BUCKET).getPublicUrl(path);

  const { data, error } = await actualizar(id, { imagen_url: pub.publicUrl, imagen_storage_path: path });
  if (error) {
    await supabase.storage.from(CATALOGO_BUCKET).remove([path]).catch(() => {});
    return { data: null, error };
  }

  if (pathAnterior) {
    const { error: delError } = await supabase.storage.from(CATALOGO_BUCKET).remove([pathAnterior]);
    if (delError) console.warn('[platosService] No se pudo borrar la imagen anterior en Storage:', delError);
  }

  return { data, error: null };
};

/**
 * Quita la imagen de un plato: borra el archivo físico (best-effort) y
 * limpia las columnas en la fila.
 * @param {number} id
 * @param {string|null} path
 */
export const eliminarImagen = async (id, path) => {
  if (path) {
    const { error: delError } = await supabase.storage.from(CATALOGO_BUCKET).remove([path]);
    if (delError) console.warn('[platosService] No se pudo borrar la imagen en Storage:', delError);
  }
  return actualizar(id, { imagen_url: null, imagen_storage_path: null });
};
