/* ── reportesService.js ────────────────────────────────────────────────────
   Capa de acceso a datos para Reportes. Las métricas de negocio se calculan
   en PostgreSQL mediante RPC SECURITY INVOKER, respetando RLS. */

import { supabase } from '../supabaseClient.js';

const _err = (error, contexto) => {
  console.error(`[reportesService] ${contexto}:`, error);
  return error?.message || 'Error inesperado';
};

const params = ({ desde = null, hasta = null, tipoEventoId = null, limite = 10 } = {}) => ({
  p_desde: desde || null,
  p_hasta: hasta || null,
  p_tipo_evento_id: tipoEventoId ? Number(tipoEventoId) : null,
  p_limite: limite ? Number(limite) : 10,
});

const rpc = async (nombre, filtros) => {
  const { data, error } = await supabase.rpc(nombre, params(filtros));
  if (error) return { data: null, error: _err(error, nombre) };
  return { data: data || [], error: null };
};

export const getTiposEvento = async () => {
  const { data, error } = await supabase
    .from('tipos_evento')
    .select('id, nombre, color')
    .eq('estado', 'Activo')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) return { data: null, error: _err(error, 'getTiposEvento') };
  return { data: data || [], error: null };
};

export const getFinanzasPeriodo = (filtros) => rpc('fn_reportes_finanzas_periodo', filtros);
export const getEventosPorEstado = (filtros) => rpc('fn_reportes_eventos_por_estado', filtros);
export const getEventosPorTipo = (filtros) => rpc('fn_reportes_eventos_por_tipo', filtros);
export const getGastosCategoria = (filtros) => rpc('fn_reportes_gastos_categoria', filtros);
export const getTopClientes = (filtros) => rpc('fn_reportes_top_clientes', filtros);
export const getBoletasPeriodo = (filtros) => rpc('fn_reportes_boletas_periodo', filtros);

export const getResumen = async (filtros = {}) => {
  const [
    finanzas,
    eventosEstado,
    eventosTipo,
    gastosCategoria,
    topClientes,
    boletasPeriodo,
  ] = await Promise.all([
    getFinanzasPeriodo(filtros),
    getEventosPorEstado(filtros),
    getEventosPorTipo({ ...filtros, limite: 12 }),
    getGastosCategoria({ ...filtros, limite: 12 }),
    getTopClientes({ ...filtros, limite: filtros.limite || 10 }),
    getBoletasPeriodo(filtros),
  ]);

  const error = [finanzas, eventosEstado, eventosTipo, gastosCategoria, topClientes, boletasPeriodo]
    .find((res) => res.error)?.error || null;

  if (error) return { data: null, error };
  return {
    data: {
      finanzas: finanzas.data,
      eventosEstado: eventosEstado.data,
      eventosTipo: eventosTipo.data,
      gastosCategoria: gastosCategoria.data,
      topClientes: topClientes.data,
      boletasPeriodo: boletasPeriodo.data,
    },
    error: null,
  };
};
