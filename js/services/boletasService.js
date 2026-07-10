/* ── boletasService.js ─────────────────────────────────────────────────────
   Capa de lectura para boletas generadas por PostgreSQL.

   Reglas:
   - El frontend nunca crea, edita ni elimina boletas.
   - Las boletas son documentos inmutables; solo se consultan para ver,
     imprimir o descargar PDF.                                               */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[boletasService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const BOLETA_SELECT = `
  id,
  numero,
  ingreso_id,
  planificador_id,
  cliente_id,
  evento_id,
  reserva_id,
  fecha,
  subtotal,
  impuestos,
  total,
  monto_pagado,
  saldo_pendiente,
  estado,
  anulado_en,
  motivo_anulacion,
  created_at,
  cliente:clientes (id, nombre, email, telefono, direccion),
  evento:eventos (id, nombre, fecha, lugar, tipo:tipos_evento (nombre)),
  reserva:reservas (id, codigo),
  servicios:boleta_servicios (id, nombre, cantidad, precio_unitario, subtotal, observaciones)
`;

export const getById = async (id) => {
  const { data, error } = await supabase
    .from('boletas')
    .select(BOLETA_SELECT)
    .eq('id', id)
    .single();

  if (error) return { data: null, error: _err(error, `getById(${id})`) };
  return { data, error: null };
};

export const getByCliente = async (clienteId) => {
  const { data, error } = await supabase
    .from('boletas')
    .select(BOLETA_SELECT)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: _err(error, `getByCliente(${clienteId})`) };
  return { data, error: null };
};

export const getByIngreso = async (ingresoId, soloEmitida = false) => {
  let query = supabase
    .from('boletas')
    .select(BOLETA_SELECT)
    .eq('ingreso_id', ingresoId)
    .order('created_at', { ascending: false });

  if (soloEmitida) query = query.eq('estado', 'Emitida');

  const { data, error } = await query;
  if (error) return { data: null, error: _err(error, `getByIngreso(${ingresoId})`) };
  return { data, error: null };
};
