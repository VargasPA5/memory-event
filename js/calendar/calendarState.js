/* ── calendarState.js ────────────────────────────────────────────────────── */

const PREF_KEY = 'memory:calendario:prefs';

const readPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; }
};

const writePrefs = (prefs) => {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {}
};

const today = new Date();
const prefs = readPrefs();

export const state = {
  currentDate: prefs.currentDate ? new Date(prefs.currentDate) : today,
  view: prefs.view || 'mes',
  filtros: {
    estado: prefs.estado || '',
    tipoId: prefs.tipoId || '',
    clienteId: prefs.clienteId || '',
    proveedorId: prefs.proveedorId || '',
    planificadorId: prefs.planificadorId || '',
    pagosPendientes: !!prefs.pagosPendientes,
    saldoPendiente: !!prefs.saldoPendiente,
    sinProveedor: !!prefs.sinProveedor,
    sinReserva: !!prefs.sinReserva,
    checklistIncompleto: !!prefs.checklistIncompleto,
    conAnexos: !!prefs.conAnexos,
    conComentarios: !!prefs.conComentarios,
    conAgenda: !!prefs.conAgenda,
  },
  eventos: [],
  selectedEventId: null,
};

export const persistPrefs = () => writePrefs({
  currentDate: state.currentDate.toISOString(),
  view: state.view,
  ...state.filtros,
});

export const setView = (view) => {
  state.view = view;
  persistPrefs();
};

export const movePeriod = (delta) => {
  const d = new Date(state.currentDate);
  if (state.view === 'mes') d.setMonth(d.getMonth() + delta);
  else if (state.view === 'semana') d.setDate(d.getDate() + delta * 7);
  else d.setDate(d.getDate() + delta);
  state.currentDate = d;
  persistPrefs();
};

export const goToday = () => {
  state.currentDate = new Date();
  persistPrefs();
};

export const getVisibleRange = () => {
  const d = new Date(state.currentDate);
  if (state.view === 'mes' || state.view === 'agenda') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const paddedStart = new Date(start);
    paddedStart.setDate(start.getDate() - start.getDay());
    const paddedEnd = new Date(end);
    paddedEnd.setDate(end.getDate() + (6 - end.getDay()));
    return { start: paddedStart, end: paddedEnd };
  }
  if (state.view === 'semana') {
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }
  return { start: d, end: d };
};

export const toISODate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getTitle = () => {
  const d = state.currentDate;
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  if (state.view === 'mes') return `${meses[d.getMonth()]} ${d.getFullYear()}`;
  const { start, end } = getVisibleRange();
  if (state.view === 'semana') return `${Fmt.dateShort(toISODate(start))} - ${Fmt.dateShort(toISODate(end))}`;
  return Fmt.date(toISODate(d));
};
