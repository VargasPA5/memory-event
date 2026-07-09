/* ── ingresosService.js ────────────────────────────────────────────────────
   Capa de acceso a datos para `ingresos` en Supabase.

   Notas de negocio importantes:
   - El campo `codigo` (PAG-XXX) lo genera automáticamente el trigger
     `fn_generar_codigo_ingreso` — nunca enviarlo en el INSERT.
   - Al insertar un ingreso con estado='Pagado', el trigger
     `fn_sync_saldo_reserva` actualiza automáticamente el saldo de la reserva.
   - El trigger `fn_generar_boleta` crea automáticamente una boleta
     en la tabla `boletas` al registrar un ingreso — sin acción adicional.
   - `planificador_id` se hereda desde la reserva via trigger cuando
     `reserva_id` está presente (`fn_ingreso_planificador_desde_reserva`).     */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[ingresosService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const _uid = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

/* ── Ingresos ────────────────────────────────────────────────────────────── */

/**
 * Devuelve todos los ingresos accesibles para el usuario actual.
 * Incluye datos del cliente y la reserva asociada.
 */
export const getAll = async () => {
  const { data, error } = await supabase
    .from('ingresos')
    .select(`
      id,
      codigo,
      concepto,
      monto,
      fecha,
      metodo,
      estado,
      created_at,
      updated_at,
      planificador_id,
      reserva_id,
      cliente_id,
      cliente:clientes (id, nombre, tipo, email),
      reserva:reservas (id, codigo, evento_id, evento:eventos (nombre)),
      planificador:perfiles!ingresos_planificador_id_fkey (id, nombre)
    `)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: _err(error, 'getAll') };
  return { data, error: null };
};

/**
 * Devuelve un ingreso por ID con sus relaciones.
 * @param {number} id
 */
export const getById = async (id) => {
  const { data, error } = await supabase
    .from('ingresos')
    .select(`
      *,
      cliente:clientes (id, nombre, tipo, email, telefono),
      reserva:reservas (id, codigo, total, saldo, evento:eventos (id, nombre)),
      planificador:perfiles!ingresos_planificador_id_fkey (id, nombre)
    `)
    .eq('id', id)
    .single();

  if (error) return { data: null, error: _err(error, `getById(${id})`) };
  return { data, error: null };
};

/**
 * Devuelve todos los ingresos de un cliente.
 * @param {number} clienteId
 */
export const getByCliente = async (clienteId) => {
  const { data, error } = await supabase
    .from('ingresos')
    .select(`
      id, codigo, concepto, monto, fecha, metodo, estado,
      reserva:reservas (codigo, evento:eventos (nombre))
    `)
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false });

  if (error) return { data: null, error: _err(error, `getByCliente(${clienteId})`) };
  return { data, error: null };
};

/**
 * Devuelve todos los ingresos de una reserva.
 * @param {number} reservaId
 */
export const getByReserva = async (reservaId) => {
  const { data, error } = await supabase
    .from('ingresos')
    .select('id, codigo, concepto, monto, fecha, metodo, estado, created_at')
    .eq('reserva_id', reservaId)
    .order('fecha');

  if (error) return { data: null, error: _err(error, `getByReserva(${reservaId})`) };
  return { data, error: null };
};

/**
 * Registra un nuevo ingreso (pago).
 * - Si viene con reserva_id, el trigger hereda planificador_id automáticamente.
 * - El trigger fn_generar_boleta crea la boleta automáticamente.
 * - El trigger fn_sync_saldo_reserva actualiza el saldo de la reserva.
 *
 * @param {{
 *   cliente_id: number,
 *   monto: number|string,
 *   fecha: string,
 *   metodo?: string,
 *   reserva_id?: number,
 *   concepto?: string,
 *   estado?: string
 * }} campos
 */
export const crear = async (campos) => {
  const uid = await _uid();
  if (!uid) return { data: null, error: 'No hay sesión activa' };

  const payload = {
    planificador_id: uid,       // puede ser sobreescrito por trigger si hay reserva_id
    cliente_id:      campos.cliente_id,
    monto:           Number(campos.monto),
    fecha:           campos.fecha,
    metodo:          campos.metodo     || 'Efectivo',
    estado:          campos.estado     || 'Pendiente',
    reserva_id:      campos.reserva_id || null,
    concepto:        campos.concepto   || null,
    // codigo: generado por trigger fn_generar_codigo_ingreso
  };

  const { data, error } = await supabase
    .from('ingresos')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, 'crear') };
  return { data, error: null };
};

/**
 * Actualiza un ingreso. No permite cambiar planificador_id, cliente_id ni codigo.
 * Cambiar `estado` a 'Pagado' disparará fn_sync_saldo_reserva si hay reserva_id.
 * @param {number} id
 * @param {object} cambios
 */
export const actualizar = async (id, cambios) => {
  const { planificador_id, cliente_id, codigo, created_by, created_at, ...campos } = cambios;

  const { data, error } = await supabase
    .from('ingresos')
    .update(campos)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `actualizar(${id})`) };
  return { data, error: null };
};

/**
 * Elimina un ingreso. Solo Administrador (RLS DELETE).
 * @param {number} id
 */
export const eliminar = async (id) => {
  const { error } = await supabase
    .from('ingresos')
    .delete()
    .eq('id', id);

  if (error) return { data: null, error: _err(error, `eliminar(${id})`) };
  return { data: true, error: null };
};

/**
 * Estadísticas de ingresos para el dashboard y reportes.
 * Devuelve: total cobrado, monto pendiente e ingresos del mes actual.
 */
export const getEstadisticas = async () => {
  const { data, error } = await supabase
    .from('ingresos')
    .select('monto, estado, fecha');

  if (error) return { data: null, error: _err(error, 'getEstadisticas') };

  const ahora   = new Date();
  const mes     = ahora.getMonth();
  const anio    = ahora.getFullYear();

  const totalCobrado = data
    .filter(i => i.estado === 'Pagado')
    .reduce((s, i) => s + Number(i.monto), 0);

  const pendiente = data
    .filter(i => i.estado === 'Pendiente')
    .reduce((s, i) => s + Number(i.monto), 0);

  const esMes = (f) => {
    const d = new Date(f);
    return d.getMonth() === mes && d.getFullYear() === anio;
  };

  const estesMes = data
    .filter(i => i.estado === 'Pagado' && esMes(i.fecha))
    .reduce((s, i) => s + Number(i.monto), 0);

  // Ingresos por mes — últimos 6 meses
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const porMes = Array.from({ length: 6 }).map((_, i) => {
    const d  = new Date(anio, mes - 5 + i, 1);
    const mm = d.getMonth();
    const yy = d.getFullYear();
    const total = data
      .filter(x => x.estado === 'Pagado' && new Date(x.fecha).getMonth() === mm && new Date(x.fecha).getFullYear() === yy)
      .reduce((s, x) => s + Number(x.monto), 0);
    return { label: MESES[mm], total };
  });

  return {
    data: { totalCobrado, pendiente, estesMes, porMes },
    error: null,
  };
};
