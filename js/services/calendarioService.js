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
const nullableBool = (value) => value === '' || value == null ? null : Boolean(value);

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
    p_pagos_pendientes: nullableBool(filtros.pagosPendientes),
    p_saldo_pendiente: nullableBool(filtros.saldoPendiente),
    p_sin_proveedor: nullableBool(filtros.sinProveedor),
    p_sin_reserva: nullableBool(filtros.sinReserva),
    p_checklist_incompleto: nullableBool(filtros.checklistIncompleto),
    p_con_anexos: nullableBool(filtros.conAnexos),
    p_con_comentarios: nullableBool(filtros.conComentarios),
    p_con_agenda: nullableBool(filtros.conAgenda),
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
  ]);

  const error = [resumen, proveedores, checklist, agenda, platos, decoraciones, comentarios, historial, anexos]
    .find(r => r.error)?.error || null;

  if (error) return { data: null, error };

  return {
    data: {
      resumen: resumen.data?.[0] || null,
      proveedores: proveedores.data || [],
      checklist: checklist.data || [],
      agenda: agenda.data || [],
      platos: platos.data || [],
      decoraciones: decoraciones.data || [],
      comentarios: comentarios.data || [],
      historial: historial.data || [],
      anexos: anexos.data || [],
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
