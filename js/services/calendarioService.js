/* ── calendarioService.js ──────────────────────────────────────────────────
   Servicio exclusivo del Calendario Operativo.

   PostgreSQL entrega métricas, alertas y agregados mediante RPCs pequeñas.
   Este servicio solo orquesta consultas y adapta eventos al formato compatible
   con FullCalendar para una migración futura. */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[calendarioService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const rpc = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { data: null, error: _err(error, fn) };
  return { data, error: null };
};

const nullableNumber = (value) => value === '' || value == null ? null : Number(value);
const nullableText = (value) => value === '' || value == null ? null : value;
const activeBool = (value) => value === true ? true : null;
const positiveNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const positiveInt = (value, fallback = 1) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const adaptEvento = (row) => ({
  id: row.id,
  title: row.title,
  start: row.start_at,
  end: row.end_at,
  backgroundColor: row.background_color,
  borderColor: row.border_color,
  textColor: row.text_color,
  extendedProps: {
    ...(row.extended_props || {}),
    estado: row.estado,
    tipo_nombre: row.tipo_nombre,
    cliente_nombre: row.cliente_nombre,
    planificador_nombre: row.planificador_nombre,
    reserva_codigo: row.reserva_codigo,
    reserva_estado: row.reserva_estado,
    reserva_total: row.reserva_total,
    reserva_saldo: row.reserva_saldo,
    pagado_total: row.pagado_total,
    gastos_total: row.gastos_total,
    proveedores_pendientes: row.proveedores_pendientes,
    checklist_pendiente: row.checklist_pendiente,
    agenda_total: row.agenda_total,
    anexos_total: row.anexos_total,
    comentarios_total: row.comentarios_total,
    alertas: row.alertas || [],
    raw: row,
  },
});

export const getEventos = async ({ desde, hasta, filtros = {} }) => {
  const res = await rpc('fn_calendario_eventos', {
    p_desde: desde,
    p_hasta: hasta,
    p_estado: nullableText(filtros.estado),
    p_tipo_id: nullableNumber(filtros.tipoId),
    p_cliente_id: nullableNumber(filtros.clienteId),
    p_proveedor_id: nullableNumber(filtros.proveedorId),
    p_planificador_id: nullableText(filtros.planificadorId),
    p_pagos_pendientes: activeBool(filtros.pagosPendientes),
    p_saldo_pendiente: activeBool(filtros.saldoPendiente),
    p_sin_proveedor: activeBool(filtros.sinProveedor),
    p_sin_reserva: activeBool(filtros.sinReserva),
    p_checklist_incompleto: activeBool(filtros.checklistIncompleto),
    p_con_anexos: activeBool(filtros.conAnexos),
    p_con_comentarios: activeBool(filtros.conComentarios),
    p_con_agenda: activeBool(filtros.conAgenda),
  });

  if (res.error) return res;
  return { data: (res.data || []).map(adaptEvento), error: null };
};

export const getEventoDetalle = async (eventoId) => {
  const [
    resumen,
    proveedores,
    checklist,
    agenda,
    platos,
    decoraciones,
    comentarios,
    historial,
    anexos,
    agendaRaw,
    platosRaw,
    decoracionesRaw,
    platosCatalogo,
    decoracionesCatalogo,
  ] = await Promise.all([
    rpc('fn_calendario_evento_resumen', { p_evento_id: eventoId }),
    rpc('fn_calendario_evento_proveedores', { p_evento_id: eventoId }),
    rpc('fn_calendario_evento_checklist', { p_evento_id: eventoId }),
    rpc('fn_calendario_evento_agenda', { p_evento_id: eventoId }),
    rpc('fn_calendario_evento_platos', { p_evento_id: eventoId }),
    rpc('fn_calendario_evento_decoraciones', { p_evento_id: eventoId }),
    rpc('fn_calendario_evento_comentarios', { p_evento_id: eventoId }),
    rpc('fn_calendario_evento_historial', { p_evento_id: eventoId }),
    rpc('fn_calendario_evento_anexos', { p_evento_id: eventoId }),
    supabase.from('evento_agenda').select('id, evento_proveedor_id').eq('evento_id', eventoId),
    supabase.from('evento_platos').select('id, plato_id').eq('evento_id', eventoId),
    supabase.from('evento_decoraciones').select('id, decoracion_id').eq('evento_id', eventoId),
    supabase.from('platos').select('id, nombre, categoria, precio_referencial, estado').eq('estado', 'Activo').order('nombre'),
    supabase.from('decoraciones').select('id, nombre, tipo, costo_referencial, estado').eq('estado', 'Activo').order('nombre'),
  ]);

  const error = [resumen, proveedores, checklist, agenda, platos, decoraciones, comentarios, historial, anexos, agendaRaw, platosRaw, decoracionesRaw, platosCatalogo, decoracionesCatalogo]
    .find(r => r.error)?.error || null;

  if (error) return { data: null, error };

  const byId = (rows = []) => new Map(rows.map(row => [Number(row.id), row]));
  const agendaIds = byId(agendaRaw.data || []);
  const platoIds = byId(platosRaw.data || []);
  const decoracionIds = byId(decoracionesRaw.data || []);

  return {
    data: {
      resumen: resumen.data?.[0] || null,
      proveedores: proveedores.data || [],
      checklist: checklist.data || [],
      agenda: (agenda.data || []).map(row => ({ ...row, evento_proveedor_id: agendaIds.get(Number(row.id))?.evento_proveedor_id || '' })),
      platos: (platos.data || []).map(row => ({ ...row, plato_id: platoIds.get(Number(row.id))?.plato_id || '' })),
      decoraciones: (decoraciones.data || []).map(row => ({ ...row, decoracion_id: decoracionIds.get(Number(row.id))?.decoracion_id || '' })),
      comentarios: comentarios.data || [],
      historial: historial.data || [],
      anexos: anexos.data || [],
      catalogos: {
        platos: platosCatalogo.data || [],
        decoraciones: decoracionesCatalogo.data || [],
      },
    },
    error: null,
  };
};

export const getOpcionesFiltros = async () => {
  const [tipos, clientes, proveedores, perfiles] = await Promise.all([
    supabase.from('tipos_evento').select('id, nombre, color').eq('estado', 'Activo').order('orden'),
    supabase.from('clientes').select('id, nombre').order('nombre'),
    supabase.from('proveedores').select('id, nombre, tipo').eq('estado', 'Activo').order('nombre'),
    supabase.from('perfiles').select('id, nombre, rol, estado').eq('estado', 'Activo').order('nombre'),
  ]);

  const error = [tipos, clientes, proveedores, perfiles].find(r => r.error)?.error || null;
  if (error) return { data: null, error: _err(error, 'getOpcionesFiltros') };

  return {
    data: {
      tipos: tipos.data || [],
      clientes: clientes.data || [],
      proveedores: proveedores.data || [],
      planificadores: perfiles.data || [],
    },
    error: null,
  };
};

/* ── Edición de operación del evento ───────────────────────────────────── */

export const crearChecklist = async (eventoId, descripcion) => {
  const payload = { evento_id: Number(eventoId), descripcion: String(descripcion || '').trim() };
  if (!payload.descripcion) return { data: null, error: 'La tarea es obligatoria' };

  const { data, error } = await supabase.from('evento_checklist').insert(payload).select().single();
  if (error) return { data: null, error: _err(error, 'crearChecklist') };
  return { data, error: null };
};

export const actualizarChecklist = async (id, cambios) => {
  const payload = {};
  if ('descripcion' in cambios) payload.descripcion = String(cambios.descripcion || '').trim();
  if ('completado' in cambios) payload.completado = !!cambios.completado;
  if ('orden' in cambios) payload.orden = Number(cambios.orden) || 0;

  const { data, error } = await supabase.from('evento_checklist').update(payload).eq('id', id).select().single();
  if (error) return { data: null, error: _err(error, `actualizarChecklist(${id})`) };
  return { data, error: null };
};

export const eliminarChecklist = async (id) => {
  const { error } = await supabase.from('evento_checklist').delete().eq('id', id);
  if (error) return { data: null, error: _err(error, `eliminarChecklist(${id})`) };
  return { data: true, error: null };
};

export const crearAgenda = async (eventoId, campos) => {
  const payload = {
    evento_id: Number(eventoId),
    hora_inicio: campos.hora_inicio,
    hora_fin: campos.hora_fin || null,
    actividad: String(campos.actividad || '').trim(),
    evento_proveedor_id: nullableNumber(campos.evento_proveedor_id),
    notas: campos.notas?.trim() || null,
  };
  if (!payload.hora_inicio || !payload.actividad) return { data: null, error: 'Hora y actividad son obligatorias' };

  const { data, error } = await supabase.from('evento_agenda').insert(payload).select().single();
  if (error) return { data: null, error: _err(error, 'crearAgenda') };
  return { data, error: null };
};

export const actualizarAgenda = async (id, campos) => {
  const payload = {
    hora_inicio: campos.hora_inicio,
    hora_fin: campos.hora_fin || null,
    actividad: String(campos.actividad || '').trim(),
    evento_proveedor_id: nullableNumber(campos.evento_proveedor_id),
    notas: campos.notas?.trim() || null,
  };
  if (!payload.hora_inicio || !payload.actividad) return { data: null, error: 'Hora y actividad son obligatorias' };

  const { data, error } = await supabase.from('evento_agenda').update(payload).eq('id', id).select().single();
  if (error) return { data: null, error: _err(error, `actualizarAgenda(${id})`) };
  return { data, error: null };
};

export const eliminarAgenda = async (id) => {
  const { error } = await supabase.from('evento_agenda').delete().eq('id', id);
  if (error) return { data: null, error: _err(error, `eliminarAgenda(${id})`) };
  return { data: true, error: null };
};

export const asociarPlato = async (eventoId, campos) => {
  const payload = {
    evento_id: Number(eventoId),
    plato_id: Number(campos.plato_id),
    cantidad: positiveInt(campos.cantidad),
    precio_unitario: positiveNumber(campos.precio_unitario),
    notas: campos.notas?.trim() || null,
  };
  if (!payload.plato_id) return { data: null, error: 'Selecciona un plato' };

  const { data, error } = await supabase.from('evento_platos').insert(payload).select().single();
  if (error) return { data: null, error: _err(error, 'asociarPlato') };
  return { data, error: null };
};

export const actualizarPlatoEvento = async (id, campos) => {
  const payload = {
    cantidad: positiveInt(campos.cantidad),
    precio_unitario: positiveNumber(campos.precio_unitario),
    notas: campos.notas?.trim() || null,
  };

  const { data, error } = await supabase.from('evento_platos').update(payload).eq('id', id).select().single();
  if (error) return { data: null, error: _err(error, `actualizarPlatoEvento(${id})`) };
  return { data, error: null };
};

export const desasociarPlato = async (id) => {
  const { error } = await supabase.from('evento_platos').delete().eq('id', id);
  if (error) return { data: null, error: _err(error, `desasociarPlato(${id})`) };
  return { data: true, error: null };
};

export const asociarDecoracion = async (eventoId, campos) => {
  const payload = {
    evento_id: Number(eventoId),
    decoracion_id: Number(campos.decoracion_id),
    cantidad: positiveInt(campos.cantidad),
    costo_unitario: positiveNumber(campos.costo_unitario),
    notas: campos.notas?.trim() || null,
  };
  if (!payload.decoracion_id) return { data: null, error: 'Selecciona una decoración' };

  const { data, error } = await supabase.from('evento_decoraciones').insert(payload).select().single();
  if (error) return { data: null, error: _err(error, 'asociarDecoracion') };
  return { data, error: null };
};

export const actualizarDecoracionEvento = async (id, campos) => {
  const payload = {
    cantidad: positiveInt(campos.cantidad),
    costo_unitario: positiveNumber(campos.costo_unitario),
    notas: campos.notas?.trim() || null,
  };

  const { data, error } = await supabase.from('evento_decoraciones').update(payload).eq('id', id).select().single();
  if (error) return { data: null, error: _err(error, `actualizarDecoracionEvento(${id})`) };
  return { data, error: null };
};

export const desasociarDecoracion = async (id) => {
  const { error } = await supabase.from('evento_decoraciones').delete().eq('id', id);
  if (error) return { data: null, error: _err(error, `desasociarDecoracion(${id})`) };
  return { data: true, error: null };
};

export const agregarComentario = async (eventoId, comentario) => {
  const payload = { evento_id: Number(eventoId), comentario: String(comentario || '').trim() };
  if (!payload.comentario) return { data: null, error: 'El comentario es obligatorio' };

  const { data, error } = await supabase.from('evento_comentarios').insert(payload).select().single();
  if (error) return { data: null, error: _err(error, 'agregarComentario') };
  return { data, error: null };
};
