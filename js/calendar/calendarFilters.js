/* ── calendarFilters.js ──────────────────────────────────────────────────── */

import { state, persistPrefs } from './calendarState.js';

const boolIds = [
  'pagosPendientes',
  'saldoPendiente',
  'sinProveedor',
  'sinReserva',
  'checklistIncompleto',
  'conAnexos',
  'conComentarios',
  'conAgenda',
];

export const initFilters = (onChange) => {
  const bindSelect = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = state.filtros[key] || '';
    el.addEventListener('change', () => {
      state.filtros[key] = el.value;
      persistPrefs();
      onChange();
    });
  };

  bindSelect('fEstado', 'estado');
  bindSelect('fTipo', 'tipoId');
  bindSelect('fCliente', 'clienteId');
  bindSelect('fProveedor', 'proveedorId');
  bindSelect('fPlanificador', 'planificadorId');

  boolIds.forEach(key => {
    const el = document.getElementById(`f_${key}`);
    if (!el) return;
    el.checked = !!state.filtros[key];
    el.addEventListener('change', () => {
      state.filtros[key] = el.checked;
      persistPrefs();
      onChange();
    });
  });

  document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
    Object.keys(state.filtros).forEach(key => {
      state.filtros[key] = typeof state.filtros[key] === 'boolean' ? false : '';
    });
    persistPrefs();
    document.querySelectorAll('.op-filters select').forEach(el => { el.value = ''; });
    boolIds.forEach(key => {
      const el = document.getElementById(`f_${key}`);
      if (el) el.checked = false;
    });
    onChange();
  });
};

export const populateFilterOptions = ({ tipos = [], clientes = [], proveedores = [], planificadores = [] }) => {
  const fill = (id, rows, getValue, getLabel, placeholder) => {
    const el = document.getElementById(id);
    if (!el) return;
    const value = el.value;
    el.innerHTML = `<option value="">${placeholder}</option>` + rows.map(row => `<option value="${escHtml(String(getValue(row)))}">${escHtml(getLabel(row))}</option>`).join('');
    el.value = value;
  };

  fill('fTipo', tipos, r => r.id, r => r.nombre, 'Todos los tipos');
  fill('fCliente', clientes, r => r.id, r => r.nombre, 'Todos los clientes');
  fill('fProveedor', proveedores, r => r.id, r => r.nombre, 'Todos los proveedores');
  fill('fPlanificador', planificadores, r => r.id, r => r.nombre, 'Todos los responsables');
};
