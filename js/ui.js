/* ── Utilidades UI compartidas ────────────────────────────────────────── */

/* ── Escape HTML (protección XSS) ───────────────────────────────────── */
const escHtml = (str) => {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
};

/* ── Formato de fechas y moneda ─────────────────────────────────────── */
const Fmt = {
  date(iso) {
    if (!iso) return '—';
    const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });
  },
  dateShort(iso) {
    if (!iso) return '—';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  },
  currency(n) {
    if (n === undefined || n === null || n === '') return '—';
    return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  currencyShort(n) {
    if (!n && n !== 0) return '—';
    const v = Number(n);
    return v >= 1000 ? 'S/ ' + (v/1000).toFixed(1) + 'k' : 'S/ ' + v;
  },
  number(n) { return Number(n).toLocaleString('es-PE'); },
};

/* ── Badge helper ───────────────────────────────────────────────────── */
const badge = (text, variant) => {
  const map = {
    'Confirmado': 'green', 'Activo':'green', 'Pagado':'green',
    'Pendiente': 'yellow',
    'Cancelado': 'red', 'Inactivo':'red', 'Vencido':'red',
    'Persona': 'blue', 'Empresa': 'orange',
    'Administrador': 'purple', 'Empleado': 'indigo',
    'Boda':'purple','Cumpleaños':'yellow','Corporativo':'blue',
    'Graduación':'green','Quinceañero':'pink','Otros':'gray',
  };
  const v = variant || map[text] || 'gray';
  return `<span class="badge badge--${v}">${escHtml(text)}</span>`;
};

/* ── Avatar con iniciales ───────────────────────────────────────────── */
const AVATAR_COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316'];
const avatarEl = (nombre, id = 0) => {
  const ini = String(nombre).split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
  const color = AVATAR_COLORS[id % AVATAR_COLORS.length];
  return `<div class="avatar-ini" style="background:${color}">${ini}</div>`;
};

/* ── Toast ──────────────────────────────────────────────────────────── */
const Toast = (() => {
  let container = null;
  const ensure = () => {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }
    }
    return container;
  };

  const ICONS = {
    success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    error:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
    warning: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    info:    `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
  };

  const show = (msg, type = 'success', ms = 3200) => {
    const c = ensure();
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.innerHTML = `<span class="toast__icon">${ICONS[type]||ICONS.info}</span><span class="toast__msg"></span><button class="toast__close">✕</button>`;
    t.querySelector('.toast__msg').textContent = msg;
    t.querySelector('.toast__close').onclick = () => dismiss(t);
    c.appendChild(t);
    requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('toast--visible')); });
    setTimeout(() => dismiss(t), ms);
  };

  const dismiss = (t) => {
    t.classList.remove('toast--visible');
    setTimeout(() => t.remove(), 300);
  };

  return {
    show,
    success: m => show(m,'success'),
    error:   m => show(m,'error'),
    warning: m => show(m,'warning'),
    info:    m => show(m,'info'),
  };
})();

/* ── Confirm dialog ─────────────────────────────────────────────────── */
const Confirm = (options = {}) => new Promise(resolve => {
  const ov = document.createElement('div');
  ov.className = 'confirm-overlay';
  ov.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-icon-wrap confirm-icon-wrap--${options.type||'danger'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
      </div>
      <h4 class="confirm-title"></h4>
      <p class="confirm-desc"></p>
      <div class="confirm-actions">
        <button class="btn btn--outline btn--sm confirm-cancel">${escHtml(options.cancelText||'Cancelar')}</button>
        <button class="btn btn--danger btn--sm confirm-ok">${escHtml(options.okText||'Confirmar')}</button>
      </div>
    </div>`;
  ov.querySelector('.confirm-title').textContent = options.title || '¿Confirmar acción?';
  ov.querySelector('.confirm-desc').textContent  = options.message || '';
  document.body.appendChild(ov);
  requestAnimationFrame(() => { requestAnimationFrame(() => ov.classList.add('confirm-overlay--open')); });

  const close = (result) => {
    ov.classList.remove('confirm-overlay--open');
    setTimeout(() => ov.remove(), 250);
    resolve(result);
  };
  ov.querySelector('.confirm-ok').onclick     = () => close(true);
  ov.querySelector('.confirm-cancel').onclick = () => close(false);
  ov.addEventListener('click', e => { if (e.target === ov) close(false); });
});

/* ── Modal genérico ─────────────────────────────────────────────────── */
const ModalHelper = {
  open(id)  { document.getElementById(id)?.classList.add('modal-overlay--open'); },
  close(id) { document.getElementById(id)?.classList.remove('modal-overlay--open'); },
  closeOnOutsideClick(id) {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) ModalHelper.close(id);
    });
  },
};

/* ── Render empty state ─────────────────────────────────────────────── */
const emptyState = (msg = 'No hay resultados') =>
  `<tr><td colspan="99">
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
      </svg>
      <p>${escHtml(msg)}</p>
    </div>
  </td></tr>`;
