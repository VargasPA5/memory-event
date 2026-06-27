// ===== INCOME LINE CHART =====
(function () {
  const ctx = document.getElementById('incomeChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      datasets: [{
        label: 'Ingresos (S/)',
        data: [9500, 11200, 14800, 18500, 21300, 25680],
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.10)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: '#7c3aed',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f9fafb',
          bodyColor: '#d1d5db',
          padding: 10,
          callbacks: {
            label: ctx => ' S/ ' + ctx.parsed.y.toLocaleString()
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af', font: { size: 11, family: 'Plus Jakarta Sans' } }
        },
        y: {
          grid: { color: '#f3f4f6' },
          ticks: {
            color: '#9ca3af',
            font: { size: 11, family: 'Plus Jakarta Sans' },
            callback: v => 'S/ ' + (v / 1000).toFixed(0) + 'k'
          }
        }
      }
    }
  });
})();

// ===== DONUT CHART =====
(function () {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Confirmadas', 'Pendientes', 'Canceladas'],
      datasets: [{
        data: [12, 7, 4],
        backgroundColor: ['#7c3aed', '#60a5fa', '#f59e0b'],
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f9fafb',
          bodyColor: '#d1d5db',
          padding: 10,
        }
      }
    }
  });
})();

// ===== NAV ACTIVE TOGGLE =====
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
  });
});