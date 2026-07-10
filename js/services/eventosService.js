/* ── eventosService.js ─────────────────────────────────────────────────────
   Capa de acceso a datos para `eventos` y el catálogo `tipos_evento`.

   La tabla `eventos` tiene FK obligatoria a `tipos_evento` (tipo_evento_id
   NOT NULL), por eso este servicio también expone getTipos() para poblar
   los selects de la UI sin una llamada extra desde cada página.

   Joins incluidos en getAll / getById para que los HTML no necesiten
   lookups adicionales:
     - cliente_nombre  (join a clientes)
     - tipo_nombre     (join a tipos_evento)
     - planificador_nombre (join a perfiles)                              */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[eventosService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const _uid = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

/* ── Catálogo de tipos de evento ─────────────────────────────────────────── */

/**
 * Obtiene todos los tipos de evento activos, ordenados por `orden`.
 * Lectura abierta (RLS SELECT = true), no requiere sesión.
 */
export const getTipos = async () => {
  const { data, error } = await supabase
    .from('tipos_evento')
    .select('id, nombre, color, icono, orden')
    .eq('estado', 'Activo')
    .order('orden');

  if (error) return { data: null, error: _err(error, 'getTipos') };
  return { data, error: null };
};

/* ── CRUD de eventos ─────────────────────────────────────────────────────── */

/**
 * Devuelve todos los eventos accesibles para el usuario actual,
 * con nombre del cliente, tipo y planificador incluidos.
 */
export const getAll = async () => {
  const { data, error } = await supabase
    .from('eventos')
    .select(`
      id,
      nombre,
      fecha,
      hora,
      lugar,
      invitados,
      estado,
      presupuesto,
      notas,
      created_at,
      updated_at,
      planificador_id,
      cliente_id,
      tipo_evento_id,
      cliente:clientes (id, nombre, tipo, email, telefono),
      tipo:tipos_evento (id, nombre, color, icono),
      planificador:perfiles!eventos_planificador_id_fkey (id, nombre)
    `)
    .order('fecha', { ascending: false });

  if (error) return { data: null, error: _err(error, 'getAll') };
  return { data, error: null };
};

/**
 * Devuelve un evento por ID con todos sus joins.
 * @param {number} id
 */
export const getById = async (id) => {
  const { data, error } = await supabase
    .from('eventos')
    .select(`
      *,
      cliente:clientes (id, nombre, tipo, email, telefono, direccion),
      tipo:tipos_evento (id, nombre, color, icono),
      planificador:perfiles!eventos_planificador_id_fkey (id, nombre)
    `)
    .eq('id', id)
    .single();

  if (error) return { data: null, error: _err(error, `getById(${id})`) };
  return { data, error: null };
};

/**
 * Crea un nuevo evento.
 * @param {{
 *   nombre, fecha, tipo_evento_id, cliente_id,
 *   hora?, lugar?, invitados?, estado?, presupuesto?, notas?
 * }} campos
 */
export const crear = async (campos) => {
  const uid = await _uid();
  if (!uid) return { data: null, error: 'No hay sesión activa' };

  const payload = {
    planificador_id: uid,
    nombre:          campos.nombre,
    fecha:           campos.fecha,
    tipo_evento_id:  campos.tipo_evento_id,
    cliente_id:      campos.cliente_id,
    hora:            campos.hora            || null,
    lugar:           campos.lugar           || null,
    invitados:       campos.invitados       ?? null,
    estado:          campos.estado          || 'Pendiente',
    presupuesto:     campos.presupuesto     ?? null,
    notas:           campos.notas           || null,
  };

  const { data, error } = await supabase
    .from('eventos')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, 'crear') };
  return { data, error: null };
};

/**
 * Actualiza campos de un evento.
 * Campos protegidos (planificador_id, cliente_id, created_by, created_at)
 * se ignoran aunque vengan en `cambios`.
 * @param {number} id
 * @param {object} cambios
 */
export const actualizar = async (id, cambios) => {
  const { planificador_id, created_by, created_at, ...campos } = cambios;

  const { data, error } = await supabase
    .from('eventos')
    .update(campos)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `actualizar(${id})`) };
  return { data, error: null };
};

/**
 * Elimina un evento. Solo el Administrador puede hacerlo (RLS DELETE).
 * Verificar dependencias (reservas) antes de llamar.
 * @param {number} id
 */
export const eliminar = async (id) => {
  const { error } = await supabase
    .from('eventos')
    .delete()
    .eq('id', id);

  if (error) return { data: null, error: _err(error, `eliminar(${id})`) };
  return { data: true, error: null };
};

/**
 * Cuenta las reservas asociadas a un evento (para advertir antes de eliminar).
 * @param {number} id
 */
export const getDependencias = async (id) => {
  const { count, error } = await supabase
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .eq('evento_id', id);

  if (error) return { data: null, error: _err(error, `getDependencias(${id})`) };
  return { data: { reservas: count ?? 0 }, error: null };
};

/**
 * Devuelve los eventos próximos (en los próximos N días).
 * Útil para el calendario y el dashboard.
 * @param {number} dias — cuántos días hacia adelante buscar (default 30)
 */
export const getProximos = async (dias = 30) => {
  const hoy   = new Date().toISOString().split('T')[0];
  const hasta = new Date(Date.now() + dias * 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('eventos')
    .select(`
      id, nombre, fecha, hora, lugar, estado,
      cliente:clientes (nombre),
      tipo:tipos_evento (nombre, color)
    `)
    .gte('fecha', hoy)
    .lte('fecha', hasta)
    .order('fecha');

  if (error) return { data: null, error: _err(error, `getProximos(${dias})`) };
  return { data, error: null };
};

/**
 * Busca eventos por nombre (para la búsqueda global del topbar).
 * @param {string} query
 */
export const buscar = async (query) => {
  if (!query || query.length < 2) return { data: [], error: null };

  const { data, error } = await supabase
    .from('eventos')
    .select('id, nombre, fecha, estado, cliente:clientes (nombre)')
    .ilike('nombre', `%${query}%`)
    .limit(10);

  if (error) return { data: null, error: _err(error, `buscar("${query}")`) };
  return { data, error: null };
};

/* ── Anexos (evento_anexos) ──────────────────────────────────────────────── */

/**
 * Obtiene los anexos de un evento.
 * @param {number} eventoId
 */
export const getAnexos = async (eventoId) => {
  const { data, error } = await supabase
    .from('evento_anexos')
    .select('id, tipo, nombre_archivo, storage_path, url, created_at')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: true });

  if (error) return { data: null, error: _err(error, `getAnexos(${eventoId})`) };
  return { data, error: null };
};

/**
 * Guarda el registro (metadata) de un anexo en la BD.
 * @param {{ evento_id, tipo, nombre_archivo, storage_path, url }} payload
 */
export const agregarAnexo = async (payload) => {
  const uid = await _uid();
  if (!uid) return { data: null, error: 'No hay sesión activa' };

  const { data, error } = await supabase
    .from('evento_anexos')
    .insert({ ...payload, created_by: uid })
    .select()
    .single();

  if (error) return { data: null, error: _err(error, 'agregarAnexo') };
  return { data, error: null };
};

/**
 * Elimina el registro del anexo de la BD.
 * Uso interno de eliminarAnexo(); llamar directo solo si el archivo físico
 * ya no existe en Storage (fila huérfana).
 * @param {number} id
 */
export const eliminarAnexoBD = async (id) => {
  const { error } = await supabase
    .from('evento_anexos')
    .delete()
    .eq('id', id);

  if (error) return { data: null, error: _err(error, `eliminarAnexoBD(${id})`) };
  return { data: true, error: null };
};

/* ── Adjuntos físicos (Supabase Storage, bucket público `adjuntos`) ───────
   Cada objeto vive bajo {evento_id}/... — impuesto por RLS sobre
   storage.objects (ver 20260709000017), validado contra la fila real de
   `eventos` (mismo dueño o administrador). */
const ADJUNTOS_BUCKET = 'adjuntos';
const MAX_ANEXO_MB = 50;

/**
 * Sube el archivo físico a Storage y guarda su metadata en evento_anexos.
 * Si falla el guardado en BD, borra el archivo recién subido (evita huérfanos).
 * @param {number} eventoId
 * @param {File} file
 */
export const subirAnexo = async (eventoId, file) => {
  const esImagen = file.type.startsWith('image/');
  const esVideo = file.type.startsWith('video/');
  if (!esImagen && !esVideo) return { data: null, error: 'Solo se permiten imágenes o videos' };
  if (file.size > MAX_ANEXO_MB * 1024 * 1024) return { data: null, error: `El archivo no debe superar ${MAX_ANEXO_MB}MB` };

  const path = `${eventoId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(ADJUNTOS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) return { data: null, error: _err(uploadError, 'subirAnexo.upload') };

  const { data: pub } = supabase.storage.from(ADJUNTOS_BUCKET).getPublicUrl(path);

  const { data, error } = await agregarAnexo({
    evento_id: eventoId,
    tipo: esVideo ? 'video' : 'imagen',
    nombre_archivo: file.name,
    storage_path: path,
    url: pub.publicUrl,
  });
  if (error) {
    await supabase.storage.from(ADJUNTOS_BUCKET).remove([path]).catch(() => {});
    return { data: null, error };
  }
  return { data, error: null };
};

/**
 * Borra el archivo físico en Storage (best-effort) y el registro en BD.
 * @param {number} id
 * @param {string} storagePath
 */
export const eliminarAnexo = async (id, storagePath) => {
  if (storagePath) {
    const { error: delError } = await supabase.storage.from(ADJUNTOS_BUCKET).remove([storagePath]);
    if (delError) console.warn('[eventosService] No se pudo borrar el anexo en Storage:', delError);
  }
  const { error } = await eliminarAnexoBD(id);
  if (error) return { data: null, error };
  return { data: true, error: null };
};
