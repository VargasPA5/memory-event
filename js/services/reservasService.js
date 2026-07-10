/* ── reservasService.js ────────────────────────────────────────────────────
   Capa de acceso a datos para `reservas` y `reserva_servicios`.

   Notas de negocio importantes:
   - El campo `codigo` (RES-XXX) lo genera automáticamente el trigger
     `fn_generar_codigo_reserva` en Supabase — nunca enviarlo en el INSERT.
   - El campo `cliente_id` en reservas lo rellena automáticamente el trigger
     `fn_reserva_cliente_desde_evento` — deriva del evento padre.
   - El campo `saldo` se sincroniza automáticamente via `fn_sync_saldo_reserva`
     al registrar/actualizar ingresos.
   - `planificador_id` lo completa PostgreSQL desde auth.uid(); el frontend
     nunca debe enviarlo.                                                   */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[reservasService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const _limpiarCabecera = (campos = {}, parcial = false) => {
  const {
    id,
    codigo,
    planificador_id,
    cliente_id,
    created_by,
    created_at,
    updated_by,
    updated_at,
    evento,
    cliente,
    planificador,
    servicios,
    ...permitidos
  } = campos;

  const payload = {};

  if (!parcial || 'evento_id' in permitidos) payload.evento_id = permitidos.evento_id;
  if (!parcial || 'fecha' in permitidos) payload.fecha = permitidos.fecha;
  if (!parcial || 'estado' in permitidos) payload.estado = permitidos.estado || 'Pendiente';
  if (!parcial || 'notas' in permitidos) payload.notas = permitidos.notas || null;
  if (!parcial || 'total' in permitidos) payload.total = Number(permitidos.total ?? 0);
  if (!parcial || 'adelanto' in permitidos) payload.adelanto = Number(permitidos.adelanto ?? 0);

  if ('total' in payload || 'adelanto' in payload) {
    const total = Number(payload.total ?? permitidos.total ?? 0);
    const adelanto = Number(payload.adelanto ?? permitidos.adelanto ?? 0);
    payload.saldo = Math.max(0, total - adelanto);
  }

  return payload;
};

const _limpiarServicio = (servicio, reservaId) => ({
  reserva_id: reservaId,
  nombre: servicio.nombre,
  cantidad: Number.parseInt(servicio.cantidad, 10) || 1,
  precio_unitario: Number(servicio.precio_unitario ?? servicio.precio ?? 0),
  observaciones: servicio.observaciones || null,
});

const _limpiarServiciosRpc = (servicios = []) => servicios.map(servicio => {
  const limpio = _limpiarServicio(servicio, null);
  const { reserva_id, ...payload } = limpio;
  return payload;
});

/* ── Reservas ────────────────────────────────────────────────────────────── */

/**
 * Devuelve todas las reservas del usuario actual con joins a evento y cliente.
 */
export const getAll = async () => {
  const { data, error } = await supabase
    .from('reservas')
    .select(`
      id,
      codigo,
      fecha,
      estado,
      total,
      adelanto,
      saldo,
      notas,
      created_at,
      updated_at,
      planificador_id,
      evento_id,
      cliente_id,
      evento:eventos (id, nombre, fecha, lugar, estado),
      cliente:clientes (id, nombre, tipo, email, telefono),
      planificador:perfiles!reservas_planificador_id_fkey (id, nombre)
    `)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: _err(error, 'getAll') };
  return { data, error: null };
};

/**
 * Devuelve una reserva por ID con sus servicios detallados.
 * @param {number} id
 */
export const getById = async (id) => {
  const [resRes, svcRes] = await Promise.all([
    supabase
      .from('reservas')
      .select(`
        *,
        evento:eventos (id, nombre, fecha, hora, lugar, estado),
        cliente:clientes (id, nombre, tipo, email, telefono, direccion),
        planificador:perfiles!reservas_planificador_id_fkey (id, nombre)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('reserva_servicios')
      .select('*')
      .eq('reserva_id', id)
      .order('id'),
  ]);

  if (resRes.error) return { data: null, error: _err(resRes.error, `getById(${id})`) };
  if (svcRes.error) return { data: null, error: _err(svcRes.error, `getById(${id}) servicios`) };

  return {
    data: { ...resRes.data, servicios: svcRes.data ?? [] },
    error: null,
  };
};

/**
 * Devuelve todas las reservas de un cliente específico.
 * @param {number} clienteId
 */
export const getByCliente = async (clienteId) => {
  const { data, error } = await supabase
    .from('reservas')
    .select(`
      id, codigo, fecha, estado, total, adelanto, saldo,
      evento:eventos (id, nombre, fecha)
    `)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: _err(error, `getByCliente(${clienteId})`) };
  return { data, error: null };
};

/**
 * Crea una nueva reserva.
 * - `cliente_id` es derivado automáticamente por trigger desde `evento_id`.
 * - `codigo` es generado automáticamente por trigger (no enviar).
 * - `saldo` se calcula como `total - adelanto` en la BD.
 *
 * @param {{
 *   evento_id, fecha, total, adelanto,
 *   estado?, notas?, servicios?
 * }} campos
 * @param {Array<{nombre, cantidad, precio_unitario, observaciones?}>} [servicios]
 */
export const crear = async (campos, servicios = []) => {
  const payload = _limpiarCabecera(campos);

  const { data, error } = await supabase.rpc('fn_crear_reserva_con_servicios', {
    p_campos: payload,
    p_servicios: _limpiarServiciosRpc(servicios),
  });

  if (error) return { data: null, error: _err(error, 'crear') };
  return { data, error: null };
};

/**
 * Actualiza campos editables de una reserva.
 * No permite cambiar planificador_id, cliente_id ni codigo.
 * @param {number} id
 * @param {object} cambios
 */
export const actualizar = async (id, cambios) => {
  const campos = _limpiarCabecera(cambios, true);

  Object.keys(campos).forEach(key => {
    if (campos[key] === undefined) delete campos[key];
  });

  if (('total' in campos && !('adelanto' in campos)) || ('adelanto' in campos && !('total' in campos))) {
    const { data: actual, error: errActual } = await supabase
      .from('reservas')
      .select('total, adelanto')
      .eq('id', id)
      .single();

    if (errActual) return { data: null, error: _err(errActual, `actualizar(${id}) saldo`) };

    const total = Number(campos.total ?? actual?.total ?? 0);
    const adelanto = Number(campos.adelanto ?? actual?.adelanto ?? 0);
    campos.saldo = Math.max(0, total - adelanto);
  }

  const { data, error } = await supabase
    .from('reservas')
    .update(campos)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `actualizar(${id})`) };
  return { data, error: null };
};

/**
 * Actualiza la cabecera de la reserva y reemplaza sus servicios.
 * La eliminación previa queda acotada por `reserva_id`; la FK con cascade evita
 * detalles huérfanos si la cabecera ya no existe.
 * @param {number} id
 * @param {object} campos
 * @param {Array<{nombre, cantidad, precio_unitario, observaciones?}>} servicios
 */
export const actualizarReservaConServicios = async (id, campos, servicios = []) => {
  const payload = _limpiarCabecera(campos, true);
  const { data, error } = await supabase.rpc('fn_actualizar_reserva_con_servicios', {
    p_reserva_id: id,
    p_campos: payload,
    p_servicios: _limpiarServiciosRpc(servicios),
  });

  if (error) return { data: null, error: _err(error, `actualizarReservaConServicios(${id})`) };
  return getById(data.id);
};

/**
 * Elimina una reserva. Solo Administrador (RLS DELETE).
 * Verificar que no tenga ingresos asociados antes.
 * @param {number} id
 */
export const eliminar = async (id) => {
  const { error } = await supabase
    .from('reservas')
    .delete()
    .eq('id', id);

  if (error) return { data: null, error: _err(error, `eliminar(${id})`) };
  return { data: true, error: null };
};

/**
 * Cuenta los ingresos asociados a una reserva (antes de eliminar).
 * @param {number} id
 */
export const getDependencias = async (id) => {
  const { count, error } = await supabase
    .from('ingresos')
    .select('id', { count: 'exact', head: true })
    .eq('reserva_id', id);

  if (error) return { data: null, error: _err(error, `getDependencias(${id})`) };
  return { data: { ingresos: count ?? 0 }, error: null };
};

/**
 * Busca reservas por código o nombre de cliente (para búsqueda global).
 * @param {string} query
 */
export const buscar = async (query) => {
  if (!query || query.length < 2) return { data: [], error: null };

  const { data, error } = await supabase
    .from('reservas')
    .select('id, codigo, estado, total, cliente:clientes (nombre)')
    .ilike('codigo', `%${query}%`)
    .limit(10);

  if (error) return { data: null, error: _err(error, `buscar("${query}")`) };
  return { data, error: null };
};
