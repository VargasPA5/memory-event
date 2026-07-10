/* ── proveedoresService.js ─────────────────────────────────────────────────
   Capa de acceso a datos para `proveedores` en Supabase.

   Proveedores es un catálogo compartido (no tiene planificador_id):
   - SELECT: abierto a cualquier usuario autenticado (RLS SELECT = true)
   - INSERT/UPDATE: cualquier planificador o admin autenticado
   - DELETE: solo Administrador

   También expone funciones para la tabla `evento_proveedores` (N:M),
   que vincula proveedores a eventos específicos con costo y estado.         */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[proveedoresService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const _uid = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

/* ── Catálogo de proveedores ─────────────────────────────────────────────── */

/**
 * Devuelve todos los proveedores. Opcionalmente filtrado por estado.
 * @param {'Activo'|'Inactivo'|null} estado — null para devolver todos
 */
export const getAll = async (estado = null) => {
  let query = supabase
    .from('proveedores')
    .select('id, nombre, tipo, contacto, telefono, email, estado, created_at, updated_at')
    .order('nombre');

  if (estado) query = query.eq('estado', estado);

  const { data, error } = await query;
  if (error) return { data: null, error: _err(error, 'getAll') };
  return { data, error: null };
};

/**
 * Devuelve un proveedor por ID.
 * @param {number} id
 */
export const getById = async (id) => {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: _err(error, `getById(${id})`) };
  return { data, error: null };
};

/**
 * Crea un nuevo proveedor en el catálogo.
 * @param {{ nombre, tipo, contacto?, telefono?, email?, estado? }} campos
 */
export const crear = async (campos) => {
  const payload = {
    nombre:   campos.nombre,
    tipo:     campos.tipo      || 'Otros',
    contacto: campos.contacto  || null,
    telefono: campos.telefono  || null,
    email:    campos.email     || null,
    estado:   campos.estado    || 'Activo',
  };

  const { data, error } = await supabase
    .from('proveedores')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, 'crear') };
  return { data, error: null };
};

/**
 * Actualiza un proveedor del catálogo.
 * @param {number} id
 * @param {object} cambios
 */
export const actualizar = async (id, cambios) => {
  const { created_by, created_at, ...campos } = cambios;

  const { data, error } = await supabase
    .from('proveedores')
    .update(campos)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `actualizar(${id})`) };
  return { data, error: null };
};

/**
 * Elimina un proveedor. Solo Administrador (RLS DELETE).
 * @param {number} id
 */
export const eliminar = async (id) => {
  const { error } = await supabase
    .from('proveedores')
    .delete()
    .eq('id', id);

  if (error) return { data: null, error: _err(error, `eliminar(${id})`) };
  return { data: true, error: null };
};

/**
 * Busca proveedores por nombre (para búsqueda global y selects de eventos).
 * @param {string} query
 */
export const buscar = async (query) => {
  if (!query || query.length < 2) return { data: [], error: null };

  const { data, error } = await supabase
    .from('proveedores')
    .select('id, nombre, tipo, estado')
    .ilike('nombre', `%${query}%`)
    .eq('estado', 'Activo')
    .limit(20);

  if (error) return { data: null, error: _err(error, `buscar("${query}")`) };
  return { data, error: null };
};

/* ── Catálogos ofrecidos por proveedor ─────────────────────────────────── */

export const getCatalogoOpciones = async () => {
  const [platos, decoraciones] = await Promise.all([
    supabase
      .from('platos')
      .select('id, nombre, categoria, descripcion, precio_referencial, estado')
      .eq('estado', 'Activo')
      .order('nombre'),
    supabase
      .from('decoraciones')
      .select('id, nombre, tipo, descripcion, costo_referencial, estado')
      .eq('estado', 'Activo')
      .order('nombre'),
  ]);

  const error = platos.error || decoraciones.error;
  if (error) return { data: null, error: _err(error, 'getCatalogoOpciones') };

  return {
    data: {
      platos: platos.data || [],
      decoraciones: decoraciones.data || [],
    },
    error: null,
  };
};

export const getCatalogosProveedor = async (proveedorId) => {
  const [platos, decoraciones] = await Promise.all([
    supabase
      .from('proveedor_platos')
      .select(`
        id,
        proveedor_id,
        plato_id,
        precio_referencial,
        activo,
        notas,
        plato:platos (id, nombre, categoria, descripcion, precio_referencial, estado)
      `)
      .eq('proveedor_id', proveedorId)
      .order('id'),
    supabase
      .from('proveedor_decoraciones')
      .select(`
        id,
        proveedor_id,
        decoracion_id,
        costo_referencial,
        activo,
        notas,
        decoracion:decoraciones (id, nombre, tipo, descripcion, costo_referencial, estado)
      `)
      .eq('proveedor_id', proveedorId)
      .order('id'),
  ]);

  const error = platos.error || decoraciones.error;
  if (error) return { data: null, error: _err(error, `getCatalogosProveedor(${proveedorId})`) };

  return {
    data: {
      platos: platos.data || [],
      decoraciones: decoraciones.data || [],
    },
    error: null,
  };
};

export const actualizarCatalogosProveedor = async (proveedorId, catalogos = {}) => {
  const platos = (catalogos.platos || []).map(item => ({
    plato_id: Number(item.plato_id),
    precio_referencial: item.precio_referencial === '' || item.precio_referencial == null
      ? null
      : Number(item.precio_referencial),
    activo: item.activo !== false,
    notas: item.notas?.trim() || null,
  })).filter(item => item.plato_id);

  const decoraciones = (catalogos.decoraciones || []).map(item => ({
    decoracion_id: Number(item.decoracion_id),
    costo_referencial: item.costo_referencial === '' || item.costo_referencial == null
      ? null
      : Number(item.costo_referencial),
    activo: item.activo !== false,
    notas: item.notas?.trim() || null,
  })).filter(item => item.decoracion_id);

  const { error } = await supabase.rpc('fn_actualizar_catalogo_proveedor', {
    p_proveedor_id: Number(proveedorId),
    p_platos: platos,
    p_decoraciones: decoraciones,
  });

  if (error) return { data: null, error: _err(error, `actualizarCatalogosProveedor(${proveedorId})`) };
  return { data: true, error: null };
};

/* ── Proveedores por evento (tabla evento_proveedores N:M) ───────────────── */

/**
 * Devuelve los proveedores asignados a un evento específico.
 * @param {number} eventoId
 */
export const getByEvento = async (eventoId) => {
  const { data, error } = await supabase
    .from('evento_proveedores')
    .select(`
      id,
      servicio_contratado,
      costo,
      estado,
      notas,
      created_at,
      proveedor:proveedores (id, nombre, tipo, contacto, telefono, email)
    `)
    .eq('evento_id', eventoId)
    .order('id');

  if (error) return { data: null, error: _err(error, `getByEvento(${eventoId})`) };
  return { data, error: null };
};

/**
 * Asigna un proveedor a un evento.
 * @param {{
 *   evento_id, proveedor_id, servicio_contratado,
 *   costo?, estado?, notas?
 * }} campos
 */
export const asignarAEvento = async (campos) => {
  const uid = await _uid();
  if (!uid) return { data: null, error: 'No hay sesión activa' };

  const payload = {
    evento_id:           campos.evento_id,
    proveedor_id:        campos.proveedor_id,
    servicio_contratado: campos.servicio_contratado || '',
    costo:               campos.costo  ?? null,
    estado:              campos.estado || 'Pendiente',
    notas:               campos.notas  || null,
    created_by:          uid,
  };

  const { data, error } = await supabase
    .from('evento_proveedores')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, 'asignarAEvento') };
  return { data, error: null };
};

/**
 * Actualiza el estado/costo de un proveedor en un evento.
 * @param {number} eventoProveedorId
 * @param {{ costo?, estado?, notas?, servicio_contratado? }} cambios
 */
export const actualizarAsignacion = async (eventoProveedorId, cambios) => {
  const { data, error } = await supabase
    .from('evento_proveedores')
    .update(cambios)
    .eq('id', eventoProveedorId)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `actualizarAsignacion(${eventoProveedorId})`) };
  return { data, error: null };
};

/**
 * Desvincula un proveedor de un evento.
 * @param {number} eventoProveedorId
 */
export const desasignarDeEvento = async (eventoProveedorId) => {
  const { error } = await supabase
    .from('evento_proveedores')
    .delete()
    .eq('id', eventoProveedorId);

  if (error) return { data: null, error: _err(error, `desasignarDeEvento(${eventoProveedorId})`) };
  return { data: true, error: null };
};
