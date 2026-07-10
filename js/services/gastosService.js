/* ── gastosService.js ───────────────────────────────────────────────────────
   Capa de acceso a datos para `gastos` en Supabase.

   Reglas de arquitectura:
   - El frontend nunca envía `planificador_id`.
   - `fn_gasto_planificador_desde_evento` deriva el planificador desde eventos.
   - `fn_set_audit_fields` completa created_by/updated_by.
   - RLS garantiza que un Planificador solo vea sus propios gastos y un
     Administrador pueda ver todo.                                           */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[gastosService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const _limpiar = (campos = {}, parcial = false) => {
  const {
    id,
    planificador_id,
    created_by,
    created_at,
    updated_by,
    updated_at,
    evento,
    evento_proveedor,
    ...permitidos
  } = campos;

  const payload = {};

  if (!parcial || 'evento_id' in permitidos) payload.evento_id = permitidos.evento_id;
  if (!parcial || 'evento_proveedor_id' in permitidos) payload.evento_proveedor_id = permitidos.evento_proveedor_id || null;
  if (!parcial || 'categoria' in permitidos) payload.categoria = permitidos.categoria || 'Otros';
  if (!parcial || 'monto' in permitidos) payload.monto = Number(permitidos.monto ?? 0);
  if (!parcial || 'fecha' in permitidos) payload.fecha = permitidos.fecha;
  if (!parcial || 'metodo' in permitidos) payload.metodo = permitidos.metodo || 'Efectivo';
  if (!parcial || 'estado' in permitidos) payload.estado = permitidos.estado || 'Pagado';
  if (!parcial || 'comprobante_url' in permitidos) payload.comprobante_url = permitidos.comprobante_url || null;
  if (!parcial || 'descripcion' in permitidos) payload.descripcion = permitidos.descripcion || null;

  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

/* ── Gastos ──────────────────────────────────────────────────────────────── */

export const getAll = async () => {
  const { data, error } = await supabase
    .from('gastos')
    .select(`
      id,
      planificador_id,
      evento_id,
      evento_proveedor_id,
      categoria,
      monto,
      fecha,
      metodo,
      estado,
      comprobante_url,
      descripcion,
      created_at,
      updated_at,
      evento:eventos (id, nombre, fecha, lugar, estado),
      evento_proveedor:evento_proveedores (
        id,
        servicio_contratado,
        proveedor:proveedores (id, nombre, tipo)
      ),
      planificador:perfiles!gastos_planificador_id_fkey (id, nombre)
    `)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: _err(error, 'getAll') };
  return { data, error: null };
};

export const getById = async (id) => {
  const { data, error } = await supabase
    .from('gastos')
    .select(`
      *,
      evento:eventos (id, nombre, fecha, lugar, estado),
      evento_proveedor:evento_proveedores (
        id,
        servicio_contratado,
        proveedor:proveedores (id, nombre, tipo, contacto)
      ),
      planificador:perfiles!gastos_planificador_id_fkey (id, nombre)
    `)
    .eq('id', id)
    .single();

  if (error) return { data: null, error: _err(error, `getById(${id})`) };
  return { data, error: null };
};

export const crear = async (campos) => {
  if (!campos.evento_id) return { data: null, error: 'Selecciona un evento' };
  const payload = _limpiar(campos);

  const { data, error } = await supabase
    .from('gastos')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, 'crear') };
  return { data, error: null };
};

export const actualizar = async (id, cambios) => {
  const payload = _limpiar(cambios, true);
  if ('evento_id' in payload && !payload.evento_id) {
    return { data: null, error: 'Todo gasto debe estar asociado a un evento' };
  }

  const { data, error } = await supabase
    .from('gastos')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `actualizar(${id})`) };
  return { data, error: null };
};

export const eliminar = async (id) => {
  const { error } = await supabase
    .from('gastos')
    .delete()
    .eq('id', id);

  if (error) return { data: null, error: _err(error, `eliminar(${id})`) };
  return { data: true, error: null };
};

export const getByEvento = async (eventoId) => {
  const { data, error } = await supabase
    .from('gastos')
    .select('id, categoria, monto, fecha, metodo, estado, descripcion')
    .eq('evento_id', eventoId)
    .order('fecha', { ascending: false });

  if (error) return { data: null, error: _err(error, `getByEvento(${eventoId})`) };
  return { data, error: null };
};

export const getEventoProveedores = async (eventoId) => {
  if (!eventoId) return { data: [], error: null };

  const { data, error } = await supabase
    .from('evento_proveedores')
    .select(`
      id,
      servicio_contratado,
      costo,
      estado,
      proveedor:proveedores (id, nombre, tipo)
    `)
    .eq('evento_id', eventoId)
    .order('id');

  if (error) return { data: null, error: _err(error, `getEventoProveedores(${eventoId})`) };
  return { data, error: null };
};
