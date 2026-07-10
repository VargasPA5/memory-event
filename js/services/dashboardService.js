/* ── dashboardService.js ───────────────────────────────────────────────────
   Orquestador de lectura para el Dashboard.

   Las métricas de negocio se calculan en PostgreSQL mediante RPCs pequeñas.
   Este servicio solo coordina llamadas y normaliza errores para la UI. */

import { supabase } from '../supabaseClient.js';

const _err = (error, ctx) => {
  console.error(`[dashboardService] ${ctx}:`, error);
  return error?.message || 'Error inesperado';
};

const rpc = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { data: null, error: _err(error, fn) };
  return { data, error: null };
};

export const getKpis = (desde = null, hasta = null) =>
  rpc('fn_dashboard_kpis', { p_desde: desde, p_hasta: hasta });

export const getFinanzasMensuales = (meses = 6) =>
  rpc('fn_dashboard_finanzas_mensuales', { p_meses: meses });

export const getReservasEstado = (desde = null, hasta = null) =>
  rpc('fn_dashboard_reservas_estado', { p_desde: desde, p_hasta: hasta });

export const getEventosProximos = (limite = 6) =>
  rpc('fn_dashboard_eventos_proximos', { p_limite: limite });

export const getReservasRecientes = (limite = 5) =>
  rpc('fn_dashboard_reservas_recientes', { p_limite: limite });

export const getActividadReciente = (limite = 12) =>
  rpc('fn_dashboard_actividad_reciente', { p_limite: limite });

export const getClientesResumen = (desde = null, hasta = null) =>
  rpc('fn_dashboard_clientes_resumen', { p_desde: desde, p_hasta: hasta });

export const getDashboard = async ({ desde = null, hasta = null, meses = 6 } = {}) => {
  const [
    kpis,
    finanzas,
    reservasEstado,
    eventosProximos,
    reservasRecientes,
    actividad,
    clientes,
  ] = await Promise.all([
    getKpis(desde, hasta),
    getFinanzasMensuales(meses),
    getReservasEstado(desde, hasta),
    getEventosProximos(6),
    getReservasRecientes(5),
    getActividadReciente(12),
    getClientesResumen(desde, hasta),
  ]);

  const error = [
    kpis,
    finanzas,
    reservasEstado,
    eventosProximos,
    reservasRecientes,
    actividad,
    clientes,
  ].find(res => res.error)?.error || null;

  if (error) return { data: null, error };

  return {
    data: {
      kpis: kpis.data || [],
      finanzas: finanzas.data || [],
      reservasEstado: reservasEstado.data || [],
      eventosProximos: eventosProximos.data || [],
      reservasRecientes: reservasRecientes.data || [],
      actividad: actividad.data || [],
      clientes: clientes.data || [],
    },
    error: null,
  };
};
