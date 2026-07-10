/* ── clientesService.js ────────────────────────────────────────────────────
   Capa de acceso a datos para la tabla `clientes` en Supabase.

   Contrato de retorno: todas las funciones devuelven { data, error }.
   - data  → el valor útil (array, objeto, null)
   - error → string legible o null

   RLS de Supabase garantiza que:
   - Un Planificador solo ve/edita sus propios clientes (planificador_id = auth.uid())
   - Un Administrador ve y edita todos
   El servicio no necesita filtrar manualmente: RLS lo hace en el servidor. */

import { supabase } from '../supabaseClient.js';

/* ── Helper interno ──────────────────────────────────────────────────────── */
const _err = (error, contexto) => {
  console.error(`[clientesService] ${contexto}:`, error);
  return error?.message || 'Error inesperado';
};

/* ── Obtener el uid del usuario autenticado ─────────────────────────────── */
const _uid = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

/* ── CRUD ─────────────────────────────────────────────────────────────────── */

/**
 * Obtiene todos los clientes accesibles para el usuario actual.
 * Incluye la cantidad de eventos asociados para mostrar dependencias en la UI.
 * @returns {{ data: Array, error: string|null }}
 */
export const getAll = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select(`
      id,
      nombre,
      tipo,
      email,
      telefono,
      direccion,
      fecha_nacimiento,
      created_at,
      updated_at,
      planificador_id,
      creado_por:perfiles!clientes_created_by_fkey (nombre)
    `)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: _err(error, 'getAll') };
  return { data, error: null };
};

/**
 * Obtiene un cliente por ID.
 * @param {number} id
 */
export const getById = async (id) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: _err(error, `getById(${id})`) };
  return { data, error: null };
};

/**
 * Crea un nuevo cliente. El planificador_id se asigna automáticamente
 * desde auth.uid() para que coincida con la política RLS de INSERT.
 * @param {{ nombre, tipo, email?, telefono?, direccion?, fecha_nacimiento? }} campos
 */
export const crear = async (campos) => {
  const uid = await _uid();
  if (!uid) return { data: null, error: 'No hay sesión activa' };

  const payload = {
    planificador_id: uid,
    nombre:          campos.nombre,
    tipo:            campos.tipo            || 'Persona',
    email:           campos.email           || null,
    telefono:        campos.telefono        || null,
    direccion:       campos.direccion       || null,
    fecha_nacimiento: campos.fecha_nacimiento || null,
  };

  const { data, error } = await supabase
    .from('clientes')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, 'crear') };
  return { data, error: null };
};

/**
 * Actualiza los campos de un cliente existente.
 * @param {number} id
 * @param {{ nombre?, tipo?, email?, telefono?, direccion?, fecha_nacimiento? }} cambios
 */
export const actualizar = async (id, cambios) => {
  // Nunca permitir cambiar planificador_id desde la UI
  const { planificador_id, created_by, created_at, ...campos } = cambios;

  const { data, error } = await supabase
    .from('clientes')
    .update(campos)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `actualizar(${id})`) };
  return { data, error: null };
};

/**
 * Elimina un cliente. RLS permite esto solo al Administrador.
 * Verificar dependencias ANTES de llamar a esta función (ver getDependencias).
 * @param {number} id
 */
export const eliminar = async (id) => {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) return { data: null, error: _err(error, `eliminar(${id})`) };
  return { data: true, error: null };
};

/**
 * Verifica cuántos eventos y reservas tiene un cliente antes de eliminarlo.
 * Útil para mostrar advertencias en la UI.
 * @param {number} id
 * @returns {{ data: { eventos: number, reservas: number }, error: string|null }}
 */
export const getDependencias = async (id) => {
  const [evRes, reRes] = await Promise.all([
    supabase.from('eventos').select('id', { count: 'exact', head: true }).eq('cliente_id', id),
    supabase.from('reservas').select('id', { count: 'exact', head: true }).eq('cliente_id', id),
  ]);

  if (evRes.error || reRes.error) {
    return { data: null, error: _err(evRes.error || reRes.error, `getDependencias(${id})`) };
  }

  return {
    data: {
      eventos:  evRes.count  ?? 0,
      reservas: reRes.count  ?? 0,
    },
    error: null,
  };
};

/**
 * Busca clientes por nombre, email o teléfono (búsqueda parcial, case-insensitive).
 * @param {string} query
 */
export const buscar = async (query) => {
  if (!query || query.length < 2) return { data: [], error: null };

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, tipo, email, telefono')
    .or(`nombre.ilike.%${query}%,email.ilike.%${query}%,telefono.ilike.%${query}%`)
    .limit(20);

  if (error) return { data: null, error: _err(error, `buscar("${query}")`) };
  return { data, error: null };
};
