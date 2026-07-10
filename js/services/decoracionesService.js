/* ── decoracionesService.js ─────────────────────────────────────────────────
   Capa de acceso a datos para el catálogo `decoraciones` en Supabase.

   La tabla es un catálogo compartido:
   - SELECT abierto por RLS.
   - INSERT/UPDATE para usuarios autenticados.
   - DELETE solo Administrador.
   - updated_at lo mantiene el trigger `trg_touch_decoraciones`.            */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[decoracionesService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const _limpiar = (campos = {}, parcial = false) => {
  const { id, created_at, updated_at, ...permitidos } = campos;
  const payload = {};

  if (!parcial || 'nombre' in permitidos) payload.nombre = permitidos.nombre;
  if (!parcial || 'tipo' in permitidos) payload.tipo = permitidos.tipo || null;
  if (!parcial || 'descripcion' in permitidos) payload.descripcion = permitidos.descripcion || null;
  if (!parcial || 'costo_referencial' in permitidos) {
    payload.costo_referencial = permitidos.costo_referencial === '' || permitidos.costo_referencial == null
      ? null
      : Number(permitidos.costo_referencial);
  }
  if (!parcial || 'estado' in permitidos) payload.estado = permitidos.estado || 'Activo';

  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

export const getAll = async (filtros = {}) => {
  let query = supabase
    .from('decoraciones')
    .select('id, nombre, tipo, descripcion, costo_referencial, estado, created_at, updated_at')
    .order('nombre');

  if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
  if (filtros.estado) query = query.eq('estado', filtros.estado);

  const { data, error } = await query;
  if (error) return { data: null, error: _err(error, 'getAll') };
  return { data, error: null };
};

export const getById = async (id) => {
  const { data, error } = await supabase
    .from('decoraciones')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: _err(error, `getById(${id})`) };
  return { data, error: null };
};

export const crear = async (campos) => {
  const payload = _limpiar(campos);

  const { data, error } = await supabase
    .from('decoraciones')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, 'crear') };
  return { data, error: null };
};

export const actualizar = async (id, cambios) => {
  const payload = _limpiar(cambios, true);

  const { data, error } = await supabase
    .from('decoraciones')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `actualizar(${id})`) };
  return { data, error: null };
};

export const eliminar = async (id) => {
  const { error } = await supabase
    .from('decoraciones')
    .delete()
    .eq('id', id);

  if (error) return { data: null, error: _err(error, `eliminar(${id})`) };
  return { data: true, error: null };
};

export const buscar = async (query) => {
  if (!query || query.trim().length < 2) return { data: [], error: null };

  const q = query.trim();
  const { data, error } = await supabase
    .from('decoraciones')
    .select('id, nombre, tipo, descripcion, costo_referencial, estado')
    .or(`nombre.ilike.%${q}%,tipo.ilike.%${q}%,descripcion.ilike.%${q}%`)
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
