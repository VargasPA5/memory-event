/* ── notificacionesService.js ──────────────────────────────────────────────
   Capa de acceso a datos para `notificaciones` en Supabase.

   Las notificaciones son generadas automáticamente por triggers de Supabase:
   - fn_notificar_cliente_nuevo    → al crear un cliente
   - fn_notificar_reserva_creada   → al crear una reserva
   - fn_notificar_pago_registrado  → al registrar un ingreso
   - fn_notificar_boleta_generada  → al generar una boleta

   El frontend solo necesita LEER y MARCAR COMO LEÍDAS.
   RLS: un usuario solo ve sus propias notificaciones (destinatario_id = auth.uid()).
   Un Administrador ve todas.

   Este servicio reemplaza la lógica de `buildNotifItems()` en app.js,
   que actualmente construye notificaciones artificialmente desde localStorage. */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[notificacionesService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const _uid = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

/* ── Lectura ─────────────────────────────────────────────────────────────── */

/**
 * Devuelve las notificaciones del usuario autenticado.
 * Las no leídas primero; máximo 50 registros.
 * @param {{ soloNoLeidas?: boolean }} opciones
 */
export const getAll = async ({ soloNoLeidas = false } = {}) => {
  let query = supabase
    .from('notificaciones')
    .select(`
      id,
      tipo,
      titulo,
      leido,
      leido_at,
      created_at,
      cliente_id,
      evento_id,
      reserva_id,
      ingreso_id,
      boleta_id
    `)
    .order('leido', { ascending: true })       // no leídas primero
    .order('created_at', { ascending: false })
    .limit(50);

  if (soloNoLeidas) query = query.eq('leido', false);

  const { data, error } = await query;
  if (error) return { data: null, error: _err(error, 'getAll') };
  return { data, error: null };
};

/**
 * Devuelve el conteo de notificaciones no leídas del usuario actual.
 * Útil para actualizar el punto rojo del ícono de notificaciones en el topbar.
 */
export const getConteoNoLeidas = async () => {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('leido', false);

  if (error) return { data: 0, error: _err(error, 'getConteoNoLeidas') };
  return { data: count ?? 0, error: null };
};

/* ── Actualización de estado de lectura ──────────────────────────────────── */

/**
 * Marca una notificación específica como leída.
 * @param {number} id
 */
export const marcarLeida = async (id) => {
  const { data, error } = await supabase
    .from('notificaciones')
    .update({ leido: true, leido_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: _err(error, `marcarLeida(${id})`) };
  return { data, error: null };
};

/**
 * Marca TODAS las notificaciones del usuario actual como leídas.
 * Equivalente al botón "Marcar todo leído" del topbar de app.js.
 */
export const marcarTodasLeidas = async () => {
  const uid = await _uid();
  if (!uid) return { data: null, error: 'No hay sesión activa' };

  const { error } = await supabase
    .from('notificaciones')
    .update({ leido: true, leido_at: new Date().toISOString() })
    .eq('leido', false)
    .eq('destinatario_id', uid);

  if (error) return { data: null, error: _err(error, 'marcarTodasLeidas') };
  return { data: true, error: null };
};

/* ── Tiempo relativo (helper de presentación) ────────────────────────────── */

/**
 * Convierte un timestamp ISO a texto relativo en español.
 * "Ahora mismo", "Hace 5m", "Hace 2h", "Hace 3d"
 * @param {string} isoTimestamp
 * @returns {string}
 */
export const tiempoRelativo = (isoTimestamp) => {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Ahora mismo';
  if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
};

/**
 * Mapea el tipo de notificación al icono emoji correspondiente.
 * @param {string} tipo
 * @returns {string}
 */
export const iconoPorTipo = (tipo) => {
  const ICONOS = {
    cliente_nuevo:    '👤',
    reserva_creada:   '📋',
    pago_registrado:  '💰',
    boleta_generada:  '🧾',
  };
  return ICONOS[tipo] ?? '🔔';
};

/* ── Suscripción en tiempo real (Realtime) ───────────────────────────────── */

/**
 * Suscribe al canal de notificaciones del usuario actual en tiempo real.
 * Llama a `callback` cada vez que llega una nueva notificación.
 *
 * Uso:
 *   const canal = await suscribir(({ nuevo }) => renderNotifs());
 *   // Para desuscribir: supabase.removeChannel(canal)
 *
 * @param {function} callback — recibe el payload del evento INSERT
 * @returns {RealtimeChannel} canal de Supabase (guardar para desuscribir)
 */
export const suscribir = async (callback) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const canal = supabase
    .channel(`notificaciones:${user.id}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notificaciones',
        filter: `destinatario_id=eq.${user.id}`,
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return canal;
};
