/* ── calendarPanel.js ────────────────────────────────────────────────────── */

const sectionList = (title, items, renderItem, emptyText) => `
  <section class="op-panel-section">
    <h4>${title}</h4>
    <div>${items.length ? items.map(renderItem).join('') : `<p class="op-muted">${emptyText}</p>`}</div>
  </section>`;

export const openPanelLoading = () => {
  const panel = document.getElementById('calendarPanel');
  panel.classList.add('open');
  panel.innerHTML = '<div class="op-panel-loading">Cargando detalle operativo...</div>';
};

export const closePanel = () => {
  document.getElementById('calendarPanel')?.classList.remove('open');
};

export const renderPanel = (detalle) => {
  const panel = document.getElementById('calendarPanel');
  const r = detalle.resumen;
  if (!panel || !r) return;

  panel.classList.add('open');
  panel.innerHTML = `
    <div class="op-panel-head">
      <div>
        <span>${escHtml(r.tipo_nombre || 'Evento')}</span>
        <h3>${escHtml(r.nombre)}</h3>
      </div>
      <button class="modal-close" id="closeCalendarPanel">✕</button>
    </div>
    <div class="op-panel-body">
      <section class="op-panel-section op-panel-summary">
        <div>${badge(r.estado)}</div>
        <p><strong>Cliente:</strong> ${escHtml(r.cliente_nombre || '—')}</p>
        <p><strong>Fecha:</strong> ${Fmt.dateShort(r.fecha)} ${r.hora ? '· ' + escHtml(r.hora) : ''}</p>
        <p><strong>Lugar:</strong> ${escHtml(r.lugar || 'Sin especificar')}</p>
        <p><strong>Planificador:</strong> ${escHtml(r.planificador_nombre || '—')}</p>
      </section>

      <section class="op-panel-section">
        <h4>Reserva</h4>
        <div class="op-money-grid">
          <div><span>Código</span><strong>${escHtml(r.reserva_codigo || '—')}</strong></div>
          <div><span>Estado</span><strong>${escHtml(r.reserva_estado || '—')}</strong></div>
          <div><span>Total</span><strong>${Fmt.currency(r.reserva_total || 0)}</strong></div>
          <div><span>Pagado</span><strong>${Fmt.currency(r.pagado_total || 0)}</strong></div>
          <div><span>Saldo</span><strong>${Fmt.currency(r.reserva_saldo || 0)}</strong></div>
          <div><span>Gastos</span><strong>${Fmt.currency(r.gastos_total || 0)}</strong></div>
        </div>
      </section>

      ${sectionList('Proveedores', detalle.proveedores, p => `<div class="op-line"><strong>${escHtml(p.proveedor_nombre)}</strong><span>${escHtml(p.servicio_contratado || p.proveedor_tipo || '')} · ${escHtml(p.estado)}</span></div>`, 'Sin proveedores asignados')}
      ${sectionList('Checklist', detalle.checklist, i => `<label class="op-check"><input type="checkbox" disabled ${i.completado ? 'checked' : ''}/><span>${escHtml(i.descripcion)}</span></label>`, 'Sin checklist')}
      ${sectionList('Agenda', detalle.agenda, a => `<div class="op-line"><strong>${escHtml(a.hora_inicio || '')}${a.hora_fin ? ' - ' + escHtml(a.hora_fin) : ''}</strong><span>${escHtml(a.actividad)}${a.proveedor_nombre ? ' · ' + escHtml(a.proveedor_nombre) : ''}</span></div>`, 'Sin agenda')}
      ${sectionList('Platos', detalle.platos, p => `<div class="op-line"><strong>${escHtml(p.plato_nombre)}</strong><span>${p.cantidad} · ${Fmt.currency(p.subtotal || 0)}</span></div>`, 'Sin platos asignados')}
      ${sectionList('Decoraciones', detalle.decoraciones, d => `<div class="op-line"><strong>${escHtml(d.decoracion_nombre)}</strong><span>${d.cantidad} · ${Fmt.currency(d.subtotal || 0)}</span></div>`, 'Sin decoraciones asignadas')}
      ${sectionList('Comentarios', detalle.comentarios, c => `<div class="op-line"><strong>${escHtml(c.autor_nombre || 'Usuario')}</strong><span>${escHtml(c.comentario)}</span></div>`, 'Sin comentarios')}
      ${sectionList('Adjuntos', detalle.anexos, a => `<a class="op-line" href="${escHtml(a.url)}" target="_blank" rel="noopener"><strong>${escHtml(a.nombre_archivo || a.tipo)}</strong><span>${escHtml(a.tipo)}</span></a>`, 'Sin adjuntos')}
      ${sectionList('Historial', detalle.historial, h => `<div class="op-line"><strong>${escHtml(h.campo_modificado)}</strong><span>${escHtml(h.valor_anterior || '—')} → ${escHtml(h.valor_nuevo || '—')}</span></div>`, 'Sin historial reciente')}

      <section class="op-panel-section">
        <h4>Acciones rápidas</h4>
        <div class="op-actions">
          <a class="btn btn--outline" href="eventos.html">Abrir Evento</a>
          <a class="btn btn--outline" href="reservas.html">Abrir Reserva</a>
          <a class="btn btn--outline" href="ingresos.html">Registrar Pago</a>
          <a class="btn btn--outline" href="clientes.html">Ver Cliente</a>
          <a class="btn btn--outline" href="proveedores.html">Ver Proveedores</a>
          <a class="btn btn--outline" href="eventos.html">Ver Adjuntos</a>
        </div>
      </section>
    </div>`;

  document.getElementById('closeCalendarPanel')?.addEventListener('click', closePanel);
};
