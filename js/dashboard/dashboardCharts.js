/* ── dashboardCharts.js ──────────────────────────────────────────────────── */

let incomeChart = null;
let reservasChart = null;

const chartTheme = () => {
  const dark = window.Theme?.get?.() === 'dark';
  return {
    grid: dark ? '#252219' : '#ede9e2',
    tick: dark ? '#8a8478' : '#6f6b64',
    ringBg: dark ? '#1c1b18' : '#fff',
    tooltip: {
      backgroundColor: dark ? '#100f0d' : '#1a1814',
      titleColor: '#eee8de',
      bodyColor: dark ? '#d7d0c4' : '#f8f4ec',
      padding: 10,
    },
  };
};

export const renderIncomeChart = (rows = []) => {
  const ctx = document.getElementById('incomeChart');
  if (!ctx || !window.Chart) return;

  const ct = chartTheme();
  incomeChart?.destroy();
  incomeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map(r => r.etiqueta),
      datasets: [
        {
          label: 'Ingresos',
          data: rows.map(r => Number(r.ingresos || 0)),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,.08)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: 'Gastos',
          data: rows.map(r => Number(r.gastos || 0)),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,.06)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: ct.tick, boxWidth: 10, font: { size: 11 } } },
        tooltip: {
          ...ct.tooltip,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Fmt.currency(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: ct.tick, font: { size: 11 } } },
        y: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 }, callback: v => Fmt.currencyShort(v) } },
      },
    },
  });
};

export const renderReservasChart = (rows = []) => {
  const ctx = document.getElementById('donutChart');
  const legend = document.getElementById('donutLegend');
  if (!ctx || !window.Chart) return;

  const data = rows.map(r => Number(r.total || 0));
  const total = data.reduce((s, n) => s + n, 0);
  const labels = rows.map(r => r.estado);
  const colors = ['#c9a35a', '#f59e0b', '#ef4444', '#10b981'];
  const ct = chartTheme();

  reservasChart?.destroy();
  if (!total) {
    if (legend) legend.innerHTML = '<div class="legend-item">Sin reservas en el periodo</div>';
    return;
  }

  reservasChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: ct.ringBg, borderWidth: 3, hoverOffset: 5 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: { legend: { display: false }, tooltip: ct.tooltip },
    },
  });

  if (legend) {
    legend.innerHTML = rows.map((r, i) => {
      const count = Number(r.total || 0);
      return `<div class="legend-item"><div class="legend-dot" style="background:${colors[i % colors.length]}"></div><span>${escHtml(r.estado)} ${count}</span></div>`;
    }).join('');
  }
};

export const bindChartThemeRefresh = (getData) => {
  window.Theme?.onChange?.(() => {
    const data = getData();
    renderIncomeChart(data.finanzas);
    renderReservasChart(data.reservasEstado);
  });
};
