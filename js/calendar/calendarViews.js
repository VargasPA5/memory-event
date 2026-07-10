/* ── calendarViews.js ────────────────────────────────────────────────────── */

import { state, getVisibleRange, toISODate, getTitle } from './calendarState.js';

const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const eventDate = (event) => (event.start || '').slice(0, 10);
const timeLabel = (event) => {
  const d = new Date(event.start);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

const alertDots = (event) => {
  const alertas = event.extendedProps?.alertas || [];
  return alertas.slice(0, 3).map(a => `<span class="op-alert op-alert--${escHtml(a.nivel)}" title="${escHtml(a.texto)}"></span>`).join('');
};

const eventChip = (event) => `
  <button class="op-event" data-event-id="${event.id}" style="border-left-color:${escHtml(event.borderColor || '#c9a35a')};background:${escHtml(event.backgroundColor || 'var(--accent-light)')}22">
    <span class="op-event__time">${escHtml(timeLabel(event))}</span>
    <span class="op-event__title">${escHtml(event.title)}</span>
    <span class="op-event__alerts">${alertDots(event)}</span>
  </button>`;

const bindEventClicks = (onSelect) => {
  document.querySelectorAll('[data-event-id]').forEach(el => {
    el.addEventListener('click', () => onSelect(Number(el.dataset.eventId)));
  });
};

export const renderShell = () => {
  document.getElementById('periodTitle').textContent = getTitle();
  document.querySelectorAll('.cal-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === state.view);
  });
};

export const renderCalendar = (onSelect) => {
  renderShell();
  if (state.view === 'mes') renderMonth(onSelect);
  else if (state.view === 'semana') renderWeek(onSelect);
  else if (state.view === 'dia') renderDay(onSelect);
  else renderAgenda(onSelect);
  renderSideSummary(onSelect);
};

const renderMonth = (onSelect) => {
  const grid = document.getElementById('calendarCanvas');
  const { start, end } = getVisibleRange();
  const today = toISODate(new Date());
  const currentMonth = state.currentDate.getMonth();
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  grid.innerHTML = `
    <div class="op-month">
      ${dayNames.map(d => `<div class="op-day-name">${d}</div>`).join('')}
      ${days.map(day => {
        const iso = toISODate(day);
        const events = state.eventos.filter(e => eventDate(e) === iso);
        return `<section class="op-day ${day.getMonth() !== currentMonth ? 'op-day--muted' : ''} ${iso === today ? 'op-day--today' : ''}">
          <header><span>${day.getDate()}</span><strong>${events.length || ''}</strong></header>
          <div class="op-day__events">${events.slice(0, 4).map(eventChip).join('')}${events.length > 4 ? `<div class="op-more">+${events.length - 4} más</div>` : ''}</div>
        </section>`;
      }).join('')}
    </div>`;
  bindEventClicks(onSelect);
};

const renderWeek = (onSelect) => {
  const grid = document.getElementById('calendarCanvas');
  const { start } = getVisibleRange();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  grid.innerHTML = `<div class="op-week">
    ${days.map(day => {
      const iso = toISODate(day);
      const events = state.eventos.filter(e => eventDate(e) === iso);
      return `<section class="op-week-day">
        <header><strong>${dayNames[day.getDay()]}</strong><span>${Fmt.dateShort(iso)}</span></header>
        <div>${events.map(eventChip).join('') || '<p class="op-empty">Sin actividades</p>'}</div>
      </section>`;
    }).join('')}
  </div>`;
  bindEventClicks(onSelect);
};

const renderDay = (onSelect) => {
  const grid = document.getElementById('calendarCanvas');
  const iso = toISODate(state.currentDate);
  const events = state.eventos.filter(e => eventDate(e) === iso);
  grid.innerHTML = `<div class="op-agenda">
    ${events.map(event => `<article class="op-agenda-item">${eventChip(event)}<p>${escHtml(event.extendedProps?.cliente_nombre || '')} · ${escHtml(event.extendedProps?.lugar || '')}</p></article>`).join('') || '<div class="empty-state"><p>No hay eventos para este día</p></div>'}
  </div>`;
  bindEventClicks(onSelect);
};

const renderAgenda = (onSelect) => {
  const grid = document.getElementById('calendarCanvas');
  const events = [...state.eventos].sort((a, b) => new Date(a.start) - new Date(b.start));
  grid.innerHTML = `<div class="op-agenda">
    ${events.map(event => `<article class="op-agenda-item">
      ${eventChip(event)}
      <p>${Fmt.dateShort(eventDate(event))} · ${escHtml(event.extendedProps?.cliente_nombre || '')} · ${escHtml(event.extendedProps?.estado || '')}</p>
    </article>`).join('') || '<div class="empty-state"><p>No hay eventos en el rango visible</p></div>'}
  </div>`;
  bindEventClicks(onSelect);
};

export const renderSideSummary = (onSelect) => {
  const next = [...state.eventos].sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 6);
  const list = document.getElementById('upcomingList');
  if (list) {
    list.innerHTML = next.map(event => `
      <button class="op-upcoming" data-event-id="${event.id}">
        <strong>${escHtml(event.title)}</strong>
        <span>${Fmt.dateShort(eventDate(event))} · ${escHtml(event.extendedProps?.cliente_nombre || '—')}</span>
      </button>`).join('') || '<div class="empty-state" style="padding:24px"><p>Sin eventos próximos</p></div>';
  }

  const resumen = document.getElementById('mesResumen');
  if (resumen) {
    const total = state.eventos.length;
    const confirmados = state.eventos.filter(e => e.extendedProps?.estado === 'Confirmado').length;
    const pendientes = state.eventos.filter(e => e.extendedProps?.estado === 'Pendiente').length;
    const alertas = state.eventos.reduce((n, e) => n + (e.extendedProps?.alertas || []).filter(a => a.nivel === 'critica').length, 0);
    resumen.innerHTML = [
      ['Eventos visibles', total],
      ['Confirmados', confirmados],
      ['Pendientes', pendientes],
      ['Alertas críticas', alertas],
    ].map(([label, value]) => `<div class="op-summary-row"><span>${label}</span><strong>${value}</strong></div>`).join('');
  }

  document.querySelectorAll('#upcomingList [data-event-id]').forEach(el => {
    el.addEventListener('click', () => onSelect(Number(el.dataset.eventId)));
  });
};
