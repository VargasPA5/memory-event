/* ── app.js — Auth guard + Sidebar injection + nav + mobile ──────────── */

/* ── Navegación ─────────────────────────────────────────────────────── */
const NAV = [
  { section: 'Principal' },
  { label:'Dashboard',    href:'dashboard.html',    page:'dashboard.html',    icon:'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z' },
  { section: 'Gestión' },
  { label:'Clientes',     href:'clientes.html',     page:'clientes.html',     icon:'M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z' },
  { label:'Eventos',      href:'eventos.html',      page:'eventos.html',      icon:'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' },
  { label:'Reservas',     href:'reservas.html',     page:'reservas.html',     icon:'M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z' },
  { label:'Ingresos',     href:'ingresos.html',     page:'ingresos.html',     icon:'M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.077 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.077-2.354-1.253V5z' },
  { label:'Gastos',       href:'gastos.html',       page:'gastos.html',       icon:'M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 100 2h6a1 1 0 100-2H7zm0 4a1 1 0 100 2h3a1 1 0 100-2H7z' },
  { label:'Platos',       href:'platos.html',       page:'platos.html',       icon:'M4 3a2 2 0 00-2 2v2a6 6 0 006 6h4a6 6 0 006-6V5a2 2 0 00-2-2H4zm3 11a1 1 0 000 2h6a1 1 0 100-2H7z' },
  { label:'Decoraciones', href:'decoraciones.html', page:'decoraciones.html', icon:'M5 3a2 2 0 00-2 2v8a4 4 0 004 4h6a4 4 0 004-4V5a2 2 0 00-2-2H5zm2 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1z' },
  { label:'Proveedores',  href:'proveedores.html',  page:'proveedores.html',  icon:'M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z' },
  { section: 'Análisis' },
  { label:'Reportes',     href:'reportes.html',     page:'reportes.html',     icon:'M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' },
  { label:'Calendario',   href:'calendario.html',   page:'calendario.html',   icon:'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' },
  { section: 'Sistema' },
  { label:'Usuarios',     href:'usuarios.html',     page:'usuarios.html',     adminOnly: true, icon:'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z' },
  { label:'Mi Perfil',    href:'perfil.html',       page:'perfil.html',       icon:'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z' },
  { label:'Configuración',href:'configuracion.html',page:'configuracion.html',icon:'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z' },
];

/* ── Determinar página activa ────────────────────────────────────────── */
const currentPage = () => {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1] || 'dashboard.html';
};

/* ── Avatar de iniciales (o foto si el usuario tiene una) ─────────────── */
const _mkAvatar = (nombre, id, size = 32, avatarUrl = '') => {
  if (avatarUrl) {
    return `<img src="${avatarUrl}" alt="${escHtml(nombre || '')}" class="avatar-img" style="width:${size}px;height:${size}px;flex-shrink:0"/>`;
  }
  const ini = String(nombre || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const COLS = ['#c9a35a','#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316'];
  const bg   = COLS[(id || 0) % COLS.length];
  const fs   = Math.round(size * 0.38);
  return `<div class="avatar-ini" style="background:${bg};width:${size}px;height:${size}px;font-size:${fs}px;flex-shrink:0">${ini}</div>`;
};

/* ── Generar HTML del sidebar ───────────────────────────────────────── */
const buildSidebarHTML = () => {
  const page  = currentPage();
  const user  = Auth.get();
  const isAdm = user?.rol === 'Administrador';
  let navHTML = '';

  NAV.forEach(item => {
    if (item.section) {
      navHTML += `<div class="nav-section-label">${item.section}</div>`;
    } else {
      if (item.adminOnly && !isAdm) return;
      const active = item.page === page ? 'active' : '';
      navHTML += `
        <a href="${item.href}" class="nav-item ${active}" data-page="${item.page}" data-tooltip="${escHtml(item.label)}">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="${item.icon}" clip-rule="evenodd"/>
          </svg>
          <span class="nav-label">${item.label}</span>
        </a>`;
    }
  });

  const userAvatar = _mkAvatar(user?.nombre || 'U', user?.id || 0, 32, user?.avatar);
  const logo = AppLogo.get();
  const brandLogoHTML = logo?.url
    ? `<img src="${logo.url}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:8px"/>`
    : `<svg width="28" height="28" viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id="sbg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stop-color="#d9b978"/><stop offset="1" stop-color="#9e7528"/>
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="19.5" fill="url(#sbg)"/>
        <circle cx="20" cy="20" r="18.5" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1"/>
        <path d="M8,31 C8,19 10,11 14,10 C16,9 18,15 20,23 C22,31 25,9 28,10 C31,11 33,21 33,31" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`;

  return `
    <div class="sidebar__inner">
      <div class="sidebar__header">
        <div class="sidebar__brand">
          <div class="brand-logo">${brandLogoHTML}</div>
          <div class="brand-text">
            <span class="brand-name">Memory</span>
            <span class="brand-ver">v2.0</span>
          </div>
        </div>
        <button class="sidebar__toggle" id="sidebarToggle" title="Colapsar/Expandir menú">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
        </button>
      </div>
      <nav class="sidebar__nav">${navHTML}</nav>
      <div class="sidebar__footer">
        <a href="perfil.html" class="sidebar-user" data-tooltip="${escHtml(user?.nombre || 'Mi Perfil')}" style="text-decoration:none;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;transition:background .15s;cursor:pointer" onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background=''">
          ${userAvatar}
          <div class="sidebar-user__info">
            <span class="sidebar-user__name">${escHtml(user?.nombre || '—')}</span>
            <span class="sidebar-user__role">${escHtml(user?.rol || '')}</span>
          </div>
        </a>
        <button onclick="Auth.logout()" class="nav-item nav-item--logout" data-tooltip="Cerrar sesión" style="background:none;border:none;width:100%;cursor:pointer;margin-top:2px">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/></svg>
          <span class="nav-label">Cerrar sesión</span>
        </button>
      </div>
    </div>`;
};

/* ── Topbar HTML ─────────────────────────────────────────────────────── */
const buildTopbarHTML = () => {
  const user = Auth.get();
  const userAvatar = _mkAvatar(user?.nombre || 'U', user?.id || 0, 32, user?.avatar);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return `
    <button class="hamburger" id="hamburger" aria-label="Menú">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
    </button>
    <div class="topbar__search">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
      <input type="text" placeholder="Buscar en Memory..." id="globalSearch"/>
    </div>
    <div class="topbar__right">
      <button class="topbar__theme" id="themeToggle" title="Cambiar tema">
        <svg id="themeIconSun" viewBox="0 0 20 20" fill="currentColor" style="display:${isDark ? 'block' : 'none'}"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 9a1 1 0 110 2h-1a1 1 0 110-2h1zM4 9a1 1 0 110 2H3a1 1 0 110-2h1zm9.193 6.243a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM4.464 4.343a1 1 0 011.414 1.414l-.707.707A1 1 0 013.757 5.05l.707-.707zM10 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-5.536-1.757a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0z"/></svg>
        <svg id="themeIconMoon" viewBox="0 0 20 20" fill="currentColor" style="display:${isDark ? 'none' : 'block'}"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
      </button>
      <div class="notif-wrapper" id="notifWrapper">
        <button class="topbar__notif" id="topbarNotifBtn" title="Notificaciones">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
          <span class="topbar__notif-dot" id="notifDot"></span>
        </button>
        <div class="notif-dropdown" id="notifDropdown">
          <div class="notif-dropdown__header">
            <span class="notif-dropdown__title">Notificaciones</span>
            <button class="notif-dropdown__mark-all" id="notifMarkAll">Marcar todo leído</button>
          </div>
          <div class="notif-dropdown__list" id="notifList"></div>
        </div>
      </div>
      <a href="perfil.html" class="topbar__user" style="text-decoration:none;color:inherit">
        ${userAvatar}
        <div class="topbar__user-info">
          <span class="topbar__user-name">${escHtml(user?.nombre || '—')}</span>
          <span class="topbar__user-role">${escHtml(user?.rol || '')}</span>
        </div>
      </a>
    </div>`;
};

/* ── Tema claro/oscuro (delegado al ThemeProvider global, ver js/theme.js) ── */
const syncThemeIcons = (theme) => {
  const sun  = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  if (!sun || !moon) return;
  sun.style.display  = theme === 'dark' ? 'block' : 'none';
  moon.style.display = theme === 'dark' ? 'none' : 'block';
};
const initThemeToggle = () => {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => syncThemeIcons(Theme.toggle()));
  Theme.onChange(syncThemeIcons);
  syncThemeIcons(Theme.get());
};

/* ── Tiempo relativo ─────────────────────────────────────────────────── */
const _timeAgo = ts => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Ahora mismo';
  if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
};

/* ── Sistema de notificaciones ──────────────────────────────────────── */
const buildNotifItems = () => {
  const items = [];
  const now   = Date.now();
  try {
    Data.ingresos.getAll().forEach(i => {
      const ts = new Date(i.createdAt || i.fecha || 0).getTime();
      if (!ts) return;
      const monto = 'S/ ' + parseFloat(i.monto || 0).toFixed(2);
      items.push({ ts, type: 'pago',    title: `Pago registrado — ${monto}`,                 sub: Data.clienteNombre(i.clienteId) });
    });
  } catch(e) {}
  try {
    Data.reservas.getAll().forEach(r => {
      const ts = new Date(r.createdAt || 0).getTime();
      if (!ts) return;
      items.push({ ts, type: 'reserva', title: `Nueva reserva — ${Data.reservaCodigo(r.id)}`, sub: Data.clienteNombre(r.clienteId) });
    });
  } catch(e) {}
  try {
    const en7 = now + 7 * 86400000;
    Data.eventos.getAll().forEach(e => {
      const fechaTs = new Date(e.fecha || 0).getTime();
      if (!fechaTs || fechaTs < now || fechaTs > en7) return;
      const d = Math.ceil((fechaTs - now) / 86400000);
      const ts = new Date(e.createdAt || e.fecha || 0).getTime();
      items.push({ ts, type: 'evento',  title: `Evento próximo — ${e.nombre}`,                sub: d < 1 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días` });
    });
  } catch(e) {}
  return items.sort((a, b) => b.ts - a.ts).slice(0, 15);
};

const renderNotifDropdown = () => {
  const list = document.getElementById('notifList');
  const dot  = document.getElementById('notifDot');
  if (!list) return;
  const lastRead = Storage.get('ep:notif:lastRead', 0);
  const items    = buildNotifItems();
  const unread   = items.filter(i => i.ts > lastRead).length;
  if (dot) dot.style.display = unread > 0 ? '' : 'none';
  if (!items.length) {
    list.innerHTML = '<div class="notif-empty">Sin notificaciones recientes</div>';
    return;
  }
  list.innerHTML = items.map(i => {
    const isNew = i.ts > lastRead;
    return `<div class="notif-item${isNew ? ' notif-item--new' : ''}">
      <div class="notif-item__icon notif-item__icon--${i.type}">${i.type==='pago' ? '💰' : i.type==='reserva' ? '📋' : '📅'}</div>
      <div class="notif-item__body">
        <div class="notif-item__title">${escHtml(i.title)}</div>
        ${i.sub ? `<div class="notif-item__sub">${escHtml(i.sub)}</div>` : ''}
        <div class="notif-item__time">${_timeAgo(i.ts)}</div>
      </div>
    </div>`;
  }).join('');
};

const initNotifDropdown = () => {
  const btn     = document.getElementById('topbarNotifBtn');
  const wrapper = document.getElementById('notifWrapper');
  const markAll = document.getElementById('notifMarkAll');
  if (!btn || !wrapper) return;

  renderNotifDropdown();

  btn.addEventListener('click', e => {
    e.stopPropagation();
    wrapper.classList.toggle('notif-wrapper--open');
    if (wrapper.classList.contains('notif-wrapper--open')) renderNotifDropdown();
  });

  markAll?.addEventListener('click', e => {
    e.stopPropagation();
    Storage.set('ep:notif:lastRead', Date.now());
    renderNotifDropdown();
  });

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) wrapper.classList.remove('notif-wrapper--open');
  });
};

/* ── Búsqueda global ─────────────────────────────────────────────────── */
const initGlobalSearch = () => {
  const input = document.getElementById('globalSearch');
  const wrap  = input?.closest('.topbar__search');
  if (!input || !wrap) return;

  const dd = document.createElement('div');
  dd.className = 'search-dropdown';
  dd.id = 'searchDropdown';
  wrap.appendChild(dd);

  const run = () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { dd.classList.remove('search-dropdown--open'); return; }
    const results = [];
    try { Data.clientes.getAll().filter(c =>
      c.nombre.toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q)
    ).slice(0,4).forEach(c => results.push({ label:c.nombre, sub:c.email, href:'clientes.html', icon:'👤' })); } catch(e){}
    try { Data.eventos.getAll().filter(e =>
      e.nombre.toLowerCase().includes(q)
    ).slice(0,3).forEach(e => results.push({ label:e.nombre, sub:e.fecha||'', href:'eventos.html', icon:'📅' })); } catch(e){}
    try { Data.reservas.getAll().filter(r =>
      (r.codigo||'').toLowerCase().includes(q) || (Data.clienteNombre(r.clienteId)||'').toLowerCase().includes(q)
    ).slice(0,3).forEach(r => results.push({ label:Data.reservaCodigo(r.id)||('Reserva #'+r.id), sub:Data.clienteNombre(r.clienteId), href:'reservas.html', icon:'📋' })); } catch(e){}
    try { Data.proveedores.getAll().filter(p =>
      p.nombre.toLowerCase().includes(q)
    ).slice(0,3).forEach(p => results.push({ label:p.nombre, sub:p.servicio||'', href:'proveedores.html', icon:'🏢' })); } catch(e){}
    if (!results.length) {
      dd.innerHTML = `<div class="search-no-results">Sin resultados para "<strong>${escHtml(q)}</strong>"</div>`;
    } else {
      dd.innerHTML = results.map(r => `<a href="${r.href}" class="search-result-item">
        <span class="search-result-icon">${r.icon}</span>
        <div class="search-result-body">
          <div class="search-result-label">${escHtml(r.label)}</div>
          ${r.sub ? `<div class="search-result-sub">${escHtml(r.sub)}</div>` : ''}
        </div></a>`).join('');
    }
    dd.classList.add('search-dropdown--open');
  };

  input.addEventListener('input', run);
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { dd.classList.remove('search-dropdown--open'); input.value = ''; }
  });
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) dd.classList.remove('search-dropdown--open');
  });
};

/* ── Inyectar sidebar + topbar ──────────────────────────────────────── */
const injectLayout = () => {
  const layout = document.querySelector('.layout');
  if (!layout) return;

  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.id = 'sidebar';
  aside.innerHTML = buildSidebarHTML();
  layout.insertBefore(aside, layout.firstChild);

  const main = document.getElementById('main');
  if (main) {
    const topbar = document.createElement('header');
    topbar.className = 'topbar';
    topbar.innerHTML = buildTopbarHTML();
    main.insertBefore(topbar, main.firstChild);
  }
};

/* ── Sidebar colapsable (desktop) ───────────────────────────────────── */
const initSidebarToggle = () => {
  const sidebar  = document.getElementById('sidebar');
  const PREF_KEY = 'ep:sidebar-collapsed';
  if (!sidebar) return;

  if (Storage.get(PREF_KEY)) sidebar.classList.add('collapsed');

  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    Storage.set(PREF_KEY, sidebar.classList.contains('collapsed'));
  });
};

/* ── Sidebar móvil ──────────────────────────────────────────────────── */
const initMobileNav = () => {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');
  if (!sidebar || !hamburger) return;

  const open  = () => { sidebar.classList.add('open'); overlay?.classList.add('open'); };
  const close = () => { sidebar.classList.remove('open'); overlay?.classList.remove('open'); };

  hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? close() : open());
  overlay?.addEventListener('click', close);
};

/* ── Inicialización ─────────────────────────────────────────────────── */
(() => {
  if (!Auth.require()) return; // Redirige a login.html si no hay sesión

  // MIGRACIÓN: Data.init() desactivado — ya no se siembran datos demo en
  // localStorage. Los módulos migrados leen desde Supabase via js/services/.
  // Los módulos aún no migrados seguirán funcionando con sus datos locales
  // existentes hasta que se migre cada página individualmente.
  // Data.init(); // ← DESACTIVADO — ver js/services/ para la nueva capa de datos

  injectLayout();
  initSidebarToggle();
  initMobileNav();
  initThemeToggle();
  initNotifDropdown();
  initGlobalSearch();

  /* Repinta el logo del sidebar si cambia en configuración (misma pestaña
     u otra recién sincronizada desde Firestore) sin recargar la página. */
  AppLogo.onChange(() => {
    const aside = document.getElementById('sidebar');
    if (!aside) return;
    aside.innerHTML = buildSidebarHTML();
    initSidebarToggle();
  });
})();
