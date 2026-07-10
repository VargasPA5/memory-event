/* ── calendarPanel.js ────────────────────────────────────────────────────── */

const sectionList = (title, items, renderItem, emptyText) => `
  <section class="op-panel-section">
    <h4>${title}</h4>
    <div>${items.length ? items.map(renderItem).join('') : `<p class="op-muted">${emptyText}</p>`}</div>
  </section>`;

const option = (value, label, selected = false, extra = '') =>
  `<option value="${escHtml(String(value))}" ${selected ? 'selected' : ''} ${extra}>${escHtml(label)}</option>`;

const proveedorOptions = (proveedores = [], selected = '') =>
  option('', 'Sin proveedor asignado', !selected) +
  proveedores.map(p => option(p.id, `${p.proveedor_nombre}${p.servicio_contratado ? ' · ' + p.servicio_contratado : ''}`, Number(selected) === Number(p.id))).join('');

const proveedorCatalogoOptions = (proveedores = [], selected = '') =>
  option('', 'Seleccionar proveedor', !selected) +
  proveedores.map(p => option(p.id, `${p.nombre}${p.tipo ? ' · ' + p.tipo : ''}`, Number(selected) === Number(p.id))).join('');

const proveedorRecursoOptions = (proveedores = [], selected = '') =>
  option('', proveedores.length ? 'Seleccionar proveedor' : 'Primero asigna un proveedor al evento', !selected) +
  proveedores.map(p => option(p.id, `${p.proveedor_nombre}${p.servicio_contratado ? ' · ' + p.servicio_contratado : ''}`, Number(selected) === Number(p.id))).join('');

const lineActions = (editAction, deleteAction, id, editLabel = 'Editar', deleteLabel = 'Eliminar') => `
  <div class="op-line-actions">
    ${editAction ? `<button type="button" class="op-mini-btn" data-action="${editAction}" data-id="${id}">${editLabel}</button>` : ''}
    <button type="button" class="op-mini-btn op-mini-btn--danger" data-action="${deleteAction}" data-id="${id}">${deleteLabel}</button>
  </div>`;

const formFields = (html, action, submitText = 'Guardar') => `
  <form class="op-inline-form" data-action="${action}">
    ${html}
    <button class="btn btn--primary btn--sm" type="submit">${submitText}</button>
  </form>`;

export const openPanelLoading = () => {
  const panel = document.getElementById('calendarPanel');
  panel.classList.add('open');
  panel.innerHTML = '<div class="op-panel-loading">Cargando detalle operativo...</div>';
};

export const closePanel = () => {
  document.getElementById('calendarPanel')?.classList.remove('open');
};

export const renderPanel = (detalle, handlers = {}) => {
  const panel = document.getElementById('calendarPanel');
  const r = detalle.resumen;
  if (!panel || !r) return;

  const platosCatalogo = detalle.catalogos?.platos || [];
  const decoracionesCatalogo = detalle.catalogos?.decoraciones || [];
  const proveedoresCatalogo = detalle.catalogos?.proveedores || [];

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

      <section class="op-panel-section">
        <h4>Proveedores</h4>
        ${formFields(`
          <input type="hidden" name="id"/>
          <select class="form-select" name="proveedor_id" required>${proveedorCatalogoOptions(proveedoresCatalogo)}</select>
          <input class="form-input" name="servicio_contratado" placeholder="Servicio contratado"/>
          <div class="op-form-grid">
            <input class="form-input" type="number" min="0" step="0.01" name="costo" placeholder="Costo"/>
            <select class="form-select" name="estado">
              <option>Pendiente</option><option>Confirmado</option><option>En camino</option><option>Finalizado</option><option>Cancelado</option>
            </select>
          </div>
          <input class="form-input" name="notas" placeholder="Notas opcionales"/>
        `, 'proveedor-save', 'Guardar proveedor')}
        <div class="op-edit-list">
          ${detalle.proveedores.length ? detalle.proveedores.map(p => `
            <div class="op-line" data-proveedor='${escHtml(JSON.stringify(p))}'>
              <strong>${escHtml(p.proveedor_nombre)}</strong>
              <span>${escHtml(p.servicio_contratado || p.proveedor_tipo || '')} · ${escHtml(p.estado)}${p.costo ? ' · ' + Fmt.currency(p.costo) : ''}</span>
              ${lineActions('proveedor-edit', 'proveedor-delete', p.id, 'Editar', 'Quitar')}
            </div>`).join('') : `<p class="op-muted">Sin proveedores asignados</p>`}
        </div>
      </section>

      <section class="op-panel-section">
        <h4>Checklist</h4>
        ${formFields('<input class="form-input" name="descripcion" placeholder="Nueva tarea pendiente" required/>', 'checklist-create', 'Agregar')}
        <div class="op-edit-list">
          ${detalle.checklist.length ? detalle.checklist.map(i => `
            <div class="op-edit-row">
              <label class="op-check"><input type="checkbox" data-action="checklist-toggle" data-id="${i.id}" ${i.completado ? 'checked' : ''}/><span>${escHtml(i.descripcion)}</span></label>
              ${lineActions('', 'checklist-delete', i.id)}
            </div>`).join('') : `<p class="op-muted">Sin checklist</p>`}
        </div>
      </section>

      <section class="op-panel-section">
        <h4>Agenda</h4>
        ${formFields(`
          <input type="hidden" name="id"/>
          <div class="op-form-grid">
            <input class="form-input" type="time" name="hora_inicio" required/>
            <input class="form-input" type="time" name="hora_fin"/>
          </div>
          <input class="form-input" name="actividad" placeholder="Actividad" required/>
          <select class="form-select" name="evento_proveedor_id">${proveedorOptions(detalle.proveedores)}</select>
          <input class="form-input" name="notas" placeholder="Notas opcionales"/>
        `, 'agenda-save', 'Guardar actividad')}
        <div class="op-edit-list">
          ${detalle.agenda.length ? detalle.agenda.map(a => `
            <div class="op-line" data-agenda='${escHtml(JSON.stringify(a))}'>
              <strong>${escHtml(a.hora_inicio || '')}${a.hora_fin ? ' - ' + escHtml(a.hora_fin) : ''}</strong>
              <span>${escHtml(a.actividad)}${a.proveedor_nombre ? ' · ' + escHtml(a.proveedor_nombre) : ''}${a.notas ? ' · ' + escHtml(a.notas) : ''}</span>
              ${lineActions('agenda-edit', 'agenda-delete', a.id)}
            </div>`).join('') : `<p class="op-muted">Sin agenda</p>`}
        </div>
      </section>

      <section class="op-panel-section">
        <h4>Platos</h4>
        ${formFields(`
          <input type="hidden" name="id"/>
          <select class="form-select" name="evento_proveedor_id" data-resource-provider="plato" required>${proveedorRecursoOptions(detalle.proveedores)}</select>
          <input class="form-input" name="plato_buscar" list="platosProveedorOptions" placeholder="Buscar plato del proveedor" required/>
          <input type="hidden" name="plato_id"/>
          <datalist id="platosProveedorOptions"></datalist>
          <div class="op-form-grid">
            <input class="form-input" type="number" min="1" step="1" name="cantidad" placeholder="Cantidad" value="1" required/>
            <input class="form-input" type="number" min="0" step="0.01" name="precio_unitario" placeholder="Precio" required/>
          </div>
          <input class="form-input" name="notas" placeholder="Notas opcionales"/>
        `, 'plato-save', 'Asociar plato')}
        <div class="op-edit-list">
          ${detalle.platos.length ? detalle.platos.map(p => `
            <div class="op-line" data-plato='${escHtml(JSON.stringify(p))}'>
              <strong>${escHtml(p.plato_nombre)}</strong>
              <span>${p.proveedor_nombre ? escHtml(p.proveedor_nombre) + ' · ' : ''}${p.cantidad} x ${Fmt.currency(p.precio_unitario || 0)} · ${Fmt.currency(p.subtotal || 0)}${p.notas ? ' · ' + escHtml(p.notas) : ''}</span>
              ${lineActions('plato-edit', 'plato-delete', p.id, 'Editar', 'Quitar')}
            </div>`).join('') : `<p class="op-muted">Sin platos asignados</p>`}
        </div>
      </section>

      <section class="op-panel-section">
        <h4>Decoraciones</h4>
        ${formFields(`
          <input type="hidden" name="id"/>
          <select class="form-select" name="evento_proveedor_id" data-resource-provider="decoracion" required>${proveedorRecursoOptions(detalle.proveedores)}</select>
          <input class="form-input" name="decoracion_buscar" list="decoracionesProveedorOptions" placeholder="Buscar decoración del proveedor" required/>
          <input type="hidden" name="decoracion_id"/>
          <datalist id="decoracionesProveedorOptions"></datalist>
          <div class="op-form-grid">
            <input class="form-input" type="number" min="1" step="1" name="cantidad" placeholder="Cantidad" value="1" required/>
            <input class="form-input" type="number" min="0" step="0.01" name="costo_unitario" placeholder="Costo" required/>
          </div>
          <input class="form-input" name="notas" placeholder="Notas opcionales"/>
        `, 'decoracion-save', 'Asociar decoración')}
        <div class="op-edit-list">
          ${detalle.decoraciones.length ? detalle.decoraciones.map(d => `
            <div class="op-line" data-decoracion='${escHtml(JSON.stringify(d))}'>
              <strong>${escHtml(d.decoracion_nombre)}</strong>
              <span>${d.proveedor_nombre ? escHtml(d.proveedor_nombre) + ' · ' : ''}${d.cantidad} x ${Fmt.currency(d.costo_unitario || 0)} · ${Fmt.currency(d.subtotal || 0)}${d.notas ? ' · ' + escHtml(d.notas) : ''}</span>
              ${lineActions('decoracion-edit', 'decoracion-delete', d.id, 'Editar', 'Quitar')}
            </div>`).join('') : `<p class="op-muted">Sin decoraciones asignadas</p>`}
        </div>
      </section>

      <section class="op-panel-section">
        <h4>Comentarios</h4>
        ${formFields('<textarea class="form-input" name="comentario" rows="3" placeholder="Agregar comentario interno" required></textarea>', 'comentario-create', 'Comentar')}
        <div class="op-edit-list">
          ${detalle.comentarios.length ? detalle.comentarios.map(c => `<div class="op-line"><strong>${escHtml(c.autor_nombre || 'Usuario')}</strong><span>${escHtml(c.comentario)}</span></div>`).join('') : `<p class="op-muted">Sin comentarios</p>`}
        </div>
      </section>

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

  const proveedorRealId = (eventoProveedorId) =>
    detalle.proveedores.find(p => Number(p.id) === Number(eventoProveedorId))?.proveedor_id || null;

  const itemLabel = (item, kind) => kind === 'plato'
    ? `${item.nombre}${item.categoria ? ' · ' + item.categoria : ''}`
    : `${item.nombre}${item.tipo ? ' · ' + item.tipo : ''}`;

  const catalogoFiltrado = (form, kind) => {
    const proveedorId = proveedorRealId(form.elements.evento_proveedor_id.value);
    const catalogo = kind === 'plato' ? platosCatalogo : decoracionesCatalogo;
    return catalogo.filter(item => Number(item.proveedor_id) === Number(proveedorId));
  };

  const pintarDatalist = (form, kind) => {
    const datalist = panel.querySelector(kind === 'plato' ? '#platosProveedorOptions' : '#decoracionesProveedorOptions');
    const hidden = form.elements[kind === 'plato' ? 'plato_id' : 'decoracion_id'];
    const input = form.elements[kind === 'plato' ? 'plato_buscar' : 'decoracion_buscar'];
    hidden.value = '';
    input.value = '';
    datalist.innerHTML = catalogoFiltrado(form, kind).map(item => `<option value="${escHtml(itemLabel(item, kind))}"></option>`).join('');
  };

  const resolverRecurso = (form, kind) => {
    const input = form.elements[kind === 'plato' ? 'plato_buscar' : 'decoracion_buscar'];
    const hidden = form.elements[kind === 'plato' ? 'plato_id' : 'decoracion_id'];
    const precio = form.elements[kind === 'plato' ? 'precio_unitario' : 'costo_unitario'];
    const texto = input.value.trim().toLowerCase();
    const item = catalogoFiltrado(form, kind).find(i => itemLabel(i, kind).toLowerCase() === texto);
    hidden.value = item?.id || '';
    if (item && precio && !precio.value) {
      const ref = kind === 'plato' ? item.precio_referencial : item.costo_referencial;
      precio.value = Number(ref || 0).toFixed(2);
    }
    return item || null;
  };

  const platoForm = panel.querySelector('[data-action="plato-save"]');
  const decoracionForm = panel.querySelector('[data-action="decoracion-save"]');
  if (platoForm) {
    platoForm.elements.evento_proveedor_id.addEventListener('change', () => pintarDatalist(platoForm, 'plato'));
    platoForm.elements.plato_buscar.addEventListener('input', () => resolverRecurso(platoForm, 'plato'));
  }
  if (decoracionForm) {
    decoracionForm.elements.evento_proveedor_id.addEventListener('change', () => pintarDatalist(decoracionForm, 'decoracion'));
    decoracionForm.elements.decoracion_buscar.addEventListener('input', () => resolverRecurso(decoracionForm, 'decoracion'));
  }

  panel.querySelectorAll('form[data-action]').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const action = form.dataset.action;
      if (action === 'plato-save' && !values.id && !resolverRecurso(form, 'plato')) {
        alert('Selecciona un plato ofrecido por el proveedor');
        return;
      }
      if (action === 'decoracion-save' && !values.id && !resolverRecurso(form, 'decoracion')) {
        alert('Selecciona una decoración ofrecida por el proveedor');
        return;
      }
      if (action === 'proveedor-save') await handlers.onProveedorSave?.(values.id || null, values);
      if (action === 'checklist-create') await handlers.onChecklistCreate?.(values.descripcion);
      if (action === 'agenda-save') await handlers.onAgendaSave?.(values.id || null, values);
      if (action === 'plato-save') await handlers.onPlatoSave?.(values.id || null, Object.fromEntries(new FormData(form).entries()));
      if (action === 'decoracion-save') await handlers.onDecoracionSave?.(values.id || null, Object.fromEntries(new FormData(form).entries()));
      if (action === 'comentario-create') await handlers.onComentarioCreate?.(values.comentario);
    });
  });

  panel.onchange = async e => {
    if (e.target.dataset.action === 'checklist-toggle') {
      await handlers.onChecklistToggle?.(Number(e.target.dataset.id), e.target.checked);
    }
  };

  panel.onclick = async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.tagName === 'FORM') return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;

    if (action === 'checklist-delete' && confirm('¿Eliminar esta tarea?')) await handlers.onChecklistDelete?.(id);
    if (action === 'proveedor-delete' && confirm('¿Quitar este proveedor del evento?')) await handlers.onProveedorDelete?.(id);
    if (action === 'agenda-delete' && confirm('¿Eliminar esta actividad?')) await handlers.onAgendaDelete?.(id);
    if (action === 'plato-delete' && confirm('¿Quitar este plato del evento?')) await handlers.onPlatoDelete?.(id);
    if (action === 'decoracion-delete' && confirm('¿Quitar esta decoración del evento?')) await handlers.onDecoracionDelete?.(id);

    if (action === 'proveedor-edit') {
      const row = JSON.parse(btn.closest('[data-proveedor]').dataset.proveedor);
      const form = panel.querySelector('[data-action="proveedor-save"]');
      form.elements.id.value = row.id;
      form.elements.proveedor_id.value = row.proveedor_id || '';
      form.elements.proveedor_id.disabled = true;
      form.elements.servicio_contratado.value = row.servicio_contratado || '';
      form.elements.costo.value = row.costo || '';
      form.elements.estado.value = row.estado || 'Pendiente';
      form.elements.notas.value = row.notas || '';
      form.querySelector('button[type="submit"]').textContent = 'Actualizar proveedor';
    }

    if (action === 'agenda-edit') {
      const row = JSON.parse(btn.closest('[data-agenda]').dataset.agenda);
      const form = panel.querySelector('[data-action="agenda-save"]');
      form.elements.id.value = row.id;
      form.elements.hora_inicio.value = String(row.hora_inicio || '').slice(0, 5);
      form.elements.hora_fin.value = String(row.hora_fin || '').slice(0, 5);
      form.elements.actividad.value = row.actividad || '';
      form.elements.evento_proveedor_id.value = row.evento_proveedor_id || '';
      form.elements.notas.value = row.notas || '';
      form.querySelector('button[type="submit"]').textContent = 'Actualizar actividad';
    }
    if (action === 'plato-edit') {
      const row = JSON.parse(btn.closest('[data-plato]').dataset.plato);
      const form = panel.querySelector('[data-action="plato-save"]');
      form.elements.id.value = row.id;
      form.elements.evento_proveedor_id.value = row.evento_proveedor_id || '';
      pintarDatalist(form, 'plato');
      form.elements.plato_id.value = row.plato_id || '';
      form.elements.plato_buscar.value = row.plato_nombre || '';
      form.elements.cantidad.value = row.cantidad || 1;
      form.elements.precio_unitario.value = row.precio_unitario || 0;
      form.elements.notas.value = row.notas || '';
      form.querySelector('button[type="submit"]').textContent = 'Actualizar plato';
    }
    if (action === 'decoracion-edit') {
      const row = JSON.parse(btn.closest('[data-decoracion]').dataset.decoracion);
      const form = panel.querySelector('[data-action="decoracion-save"]');
      form.elements.id.value = row.id;
      form.elements.evento_proveedor_id.value = row.evento_proveedor_id || '';
      pintarDatalist(form, 'decoracion');
      form.elements.decoracion_id.value = row.decoracion_id || '';
      form.elements.decoracion_buscar.value = row.decoracion_nombre || '';
      form.elements.cantidad.value = row.cantidad || 1;
      form.elements.costo_unitario.value = row.costo_unitario || 0;
      form.elements.notas.value = row.notas || '';
      form.querySelector('button[type="submit"]').textContent = 'Actualizar decoración';
    }
  };
};
