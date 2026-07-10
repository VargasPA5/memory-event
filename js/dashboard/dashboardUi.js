/* ── dashboardUi.js ──────────────────────────────────────────────────────── */

const kpiMeta = {
  eventos_proximos: { id: 'k-eventos-proximos', label: 'Eventos Próximos' },
  reservas_confirmadas: { id: 'k-reservas', label: 'Reservas Confirmadas' },
  ingresos_cobrados: { id: 'k-ingresos', label: 'Ingresos Cobrados' },
  gastos_pagados: { id: 'k-gastos', label: 'Gastos Pagados' },
  utilidad_estimada: { id: 'k-utilidad', label: 'Utilidad Estimada' },
  saldo_pendiente: { id: 'k-saldo', label: 'Saldo Pendiente' },
  clientes_nuevos: { id: 'k-clientes', label: 'Clientes Nuevos' },
  boletas_emitidas: { id: 'k-boletas', label: 'Boletas Emitidas' },
};

const formatValor = (row) => row.formato === 'moneda'
  ? Fmt.currencyShort(Number(row.valor || 0))
  : String(Number(row.valor || 0));

export const renderGreeting = () => {
  const user = Auth.get();
  const sub = document.getElementById('greetSub');
  if (!sub || !user) return;
  const scope = user.rol === 'Administrador' ? 'resumen general del negocio' : 'resumen de tus eventos y reservas';
  sub.innerHTML = `Bienvenido, <strong>${escHtml(user.nombre)}</strong>. Aquí tienes un ${scope}.`;
};

export const setLoading = (isLoading) => {
  const status = document.getElementById('dashboardStatus');
  if (status) status.textContent = isLoading ? 'Cargando datos...' : 'Actualizado';
};

export const renderKpis = (rows = []) => {
  rows.forEach(row => {
    const meta = kpiMeta[row.clave];
    if (!meta) return;
    const value = document.getElementById(meta.id);
    const trend = document.getElementById(`${meta.id}-trend`);
    if (value) value.textContent = formatValor(row);
    if (trend) trend.textContent = row.detalle || '';
  });
};

export const renderClientesResumen = (rows = []) => {
  const map = Object.fromEntries(rows.map(r => [r.clave, Number(r.valor || 0)]));
  const el = document.getElementById('clientesResumen');
  if (!el) return;
  el.innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div><span>Total: ${map.total || 0}</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div><span>Nuevos: ${map.nuevos_periodo || 0}</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div><span>Personas: ${map.personas || 0}</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#8b5cf6"></div><span>Empresas: ${map.empresas || 0}</span></div>`;
};

export const renderEventosProximos = (eventos = []) => {
  const wrap = document.getElementById('upcomingEvents');
  if (!wrap) return;
  if (!eventos.length) {
    wrap.innerHTML = '<div class="empty-state"><p>No hay eventos próximos</p></div>';
    return;
  }
  wrap.innerHTML = eventos.map(ev => `
    <div class="event-item">
      <div class="avatar-ini" style="background:${escHtml(ev.tipo_color || '#c9a35a')};color:#1a1917;width:36px;height:36px;font-size:13px;border-radius:8px">${escHtml((ev.tipo_nombre || 'EV').slice(0,2).toUpperCase())}</div>
      <div class="event-item-info">
        <div class="event-item-name">${escHtml(ev.nombre)}</div>
        <div class="event-item-date">${Fmt.dateShort(ev.fecha)} · ${escHtml(ev.hora || '')}</div>
        <div class="event-item-date">${escHtml(ev.cliente_nombre || 'Sin cliente')} · ${escHtml(ev.planificador_nombre || '—')}</div>
      </div>
      ${badge(ev.estado)}
    </div>`).join('');
};

export const renderReservasRecientes = (reservas = []) => {
  const tbody = document.getElementById('recentReservas');
  if (!tbody) return;
  if (!reservas.length) {
    tbody.innerHTML = emptyState('No hay reservas recientes');
    return;
  }
  tbody.innerHTML = reservas.map(r => `
    <tr>
      <td><div class="client-cell">${avatarEl(r.cliente_nombre || 'C', r.id)}<span>${escHtml(r.cliente_nombre || '—')}</span></div></td>
      <td>${escHtml(r.evento_nombre || r.codigo || '—')}</td>
      <td>${Fmt.dateShort(r.fecha)}</td>
      <td>${badge(r.estado)}</td>
      <td><strong>${Fmt.currency(r.saldo || 0)}</strong></td>
    </tr>`).join('');
};

export const renderActividad = (items = []) => {
  const wrap = document.getElementById('recentIngresos');
  if (!wrap) return;
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state"><p>Sin actividad reciente</p></div>';
    return;
  }
  wrap.innerHTML = items.slice(0, 8).map(item => `
    <a class="income-item" href="${escHtml(item.destino || 'dashboard.html')}" style="text-decoration:none;color:inherit">
      <div class="income-icon">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.077 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.077-2.354-1.253V5z" clip-rule="evenodd"/></svg>
      </div>
      <div class="income-info">
        <div class="income-ref">${escHtml(item.titulo)}</div>
        <div class="income-client">${escHtml(item.detalle || '')}</div>
      </div>
      <div class="income-right">
        <div class="income-date">${Fmt.dateShort(item.fecha)}</div>
      </div>
    </a>`).join('');
};
