/* ── reservasService.js ────────────────────────────────────────────────────
   Capa de acceso a datos para `reservas` y `reserva_servicios`.

   Notas de negocio importantes:
   - El campo `codigo` (RES-XXX) lo genera automáticamente el trigger
     `fn_generar_codigo_reserva` en Supabase — nunca enviarlo en el INSERT.
   - El campo `cliente_id` en reservas lo rellena automáticamente el trigger
     `fn_reserva_cliente_desde_evento` — deriva del evento padre.
   - El campo `saldo` se sincroniza automáticamente via `fn_sync_saldo_reserva`
     al registrar/actualizar ingresos.
   - `planificador_id` se asigna desde auth.uid() en el INSERT.            */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[reservasService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const _uid = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

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
  const uid = await _uid();
  if (!uid) return { data: null, error: 'No hay sesión activa' };

  // La BD calcula saldo; lo enviamos como total - adelanto para el check constraint.
  const adelanto = Number(campos.adelanto) || 0;
  const total    = Number(campos.total)    || 0;

  const payload = {
    planificador_id: uid,
    evento_id:       campos.evento_id,
    fecha:           campos.fecha,
    estado:          campos.estado || 'Pendiente',
    total,
    adelanto,
    saldo:           Math.max(0, total - adelanto),
    notas:           campos.notas || null,
    // codigo: generado por trigger fn_generar_codigo_reserva
    // cliente_id: derivado por trigger fn_reserva_cliente_desde_evento
  };

  const { data: reserva, error: errRes } = await supabase
    .from('reservas')
    .insert(payload)
    .select()
    .single();

  if (errRes) return { data: null, error: _err(errRes, 'crear') };

  // Insertar servicios de la reserva si los hay
  if (servicios.length > 0) {
    const svcPayload = servicios.map(s => ({
      reserva_id:     reserva.id,
      servicio_id:    s.servicio_id ?? null,
      nombre:         s.nombre,
      cantidad:       s.cantidad        || 1,
      precio_unitario: s.precio_unitario || 0,
      observaciones:  s.observaciones   || null,
    }));

    const { error: errSvc } = await supabase
      .from('reserva_servicios')
      .insert(svcPayload);

    if (errSvc) {
      console.warn('[reservasService] crear — servicios parcialmente fallidos:', errSvc);
    }
  }

  return { data: reserva, error: null };
};

/**
 * Actualiza campos editables de una reserva.
 * No permite cambiar planificador_id, cliente_id ni codigo.
 * @param {number} id
 * @param {object} cambios
 */
export const actualizar = async (id, cambios) => {
  const { planificador_id, cliente_id, codigo, created_by, created_at, ...campos } = cambios;

  // Recalcular saldo si cambiaron total o adelanto
  if ('total' in campos || 'adelanto' in campos) {
    const { data: actual } = await supabase
      .from('reservas')
      .select('total, adelanto')
      .eq('id', id)
      .single();
    const total   = Number(campos.total   ?? actual?.total   ?? 0);
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
