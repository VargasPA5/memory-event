/* ── boletas.js ────────────────────────────────────────────────────────────
   Visor de boletas emitidas por PostgreSQL.

   Este archivo no crea, actualiza ni elimina boletas. La base de datos genera
   los documentos y el frontend solo permite ver, imprimir y descargar PDF. */
const Boletas = (() => {
  const serviciosBoleta = (boleta) => (boleta.servicios || []).map(s => ({
    nombre: s.nombre || '—',
    cantidad: s.cantidad || 1,
    precio: s.precio_unitario ?? s.precio ?? 0,
    subtotal: s.subtotal ?? 0,
    observaciones: s.observaciones || '',
  }));

  const templateHTML = (boleta) => {
    const cliente = boleta.cliente || {};
    const evento = boleta.evento || {};
    const reserva = boleta.reserva || {};
    const servicios = serviciosBoleta(boleta);
    const fechaHora = boleta.created_at ? new Date(boleta.created_at) : new Date();

    const filasServicios = servicios.map(s => `
      <tr>
        <td>${escHtml(s.nombre)}</td>
        <td style="text-align:center">${escHtml(String(s.cantidad))}</td>
        <td style="text-align:right">${Fmt.currency(s.precio)}</td>
        <td style="text-align:right">${Fmt.currency(s.subtotal)}</td>
        <td>${escHtml(s.observaciones || '—')}</td>
      </tr>`).join('');

    return `
      <div class="boleta-header">
        <div>
          <h2>Memory Events</h2>
          <p class="boleta-numero">Boleta N° ${escHtml(boleta.numero)}</p>
        </div>
        <div class="boleta-fecha">
          <p>${fechaHora.toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' })}</p>
          <p>${fechaHora.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })}</p>
        </div>
      </div>

      <div class="boleta-grid">
        <div class="boleta-box">
          <h4>Datos del cliente</h4>
          <p><strong>${escHtml(cliente.nombre || '—')}</strong></p>
          <p>${escHtml(cliente.email || '—')}</p>
          <p>${escHtml(cliente.telefono || '—')}</p>
          <p>${escHtml(cliente.direccion || '—')}</p>
        </div>
        <div class="boleta-box">
          <h4>Datos del evento</h4>
          <p><strong>${escHtml(evento.nombre || '—')}</strong></p>
          <p>${escHtml(evento.tipo?.nombre || evento.tipo || '—')}</p>
          <p>${evento.fecha ? Fmt.date(evento.fecha) : '—'}</p>
          <p>${escHtml(evento.lugar || '—')}</p>
          ${reserva.id ? `<p>Reserva ${escHtml(reserva.codigo || '')}</p>` : ''}
        </div>
      </div>

      <table class="boleta-table">
        <thead><tr><th>Servicio</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th>Obs.</th></tr></thead>
        <tbody>${filasServicios}</tbody>
      </table>

      <div class="boleta-totales">
        <div><span>Subtotal</span><span>${Fmt.currency(boleta.subtotal)}</span></div>
        <div><span>Impuestos</span><span>${Fmt.currency(boleta.impuestos)}</span></div>
        <div class="boleta-total-final"><span>Total</span><span>${Fmt.currency(boleta.total)}</span></div>
        <div class="boleta-pagado"><span>Monto pagado</span><span>${Fmt.currency(boleta.monto_pagado)}</span></div>
        <div><span>Saldo pendiente</span><span style="color:${Number(boleta.saldo_pendiente) > 0 ? 'var(--red)' : 'var(--green)'}">${Fmt.currency(boleta.saldo_pendiente)}</span></div>
      </div>`;
  };

  let overlay = null;
  const ensureOverlay = () => {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'boletaOverlay';
    overlay.innerHTML = `
      <div class="modal modal--lg">
        <div class="modal-header">
          <h3>Boleta de pago</h3>
          <button class="modal-close" id="boletaCerrarBtn">✕</button>
        </div>
        <div id="boletaPrintArea"></div>
        <div class="modal-footer">
          <button class="btn btn--outline" id="boletaCerrarBtn2">Cerrar</button>
          <button class="btn btn--outline" id="boletaImprimirBtn">Imprimir</button>
          <button class="btn btn--primary" id="boletaPdfBtn">Descargar PDF</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrarPreview(); });
    overlay.querySelector('#boletaCerrarBtn').addEventListener('click', cerrarPreview);
    overlay.querySelector('#boletaCerrarBtn2').addEventListener('click', cerrarPreview);
    return overlay;
  };

  const cerrarPreview = () => overlay?.classList.remove('modal-overlay--open');

  const abrirPreview = (boleta) => {
    const ov = ensureOverlay();
    ov.querySelector('#boletaPrintArea').innerHTML = templateHTML(boleta);
    ov.querySelector('#boletaImprimirBtn').onclick = () => imprimir();
    ov.querySelector('#boletaPdfBtn').onclick = () => descargarPDF(boleta);
    ov.classList.add('modal-overlay--open');
  };

  const imprimir = () => window.print();

  const descargarPDF = (boleta) => {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      Toast.error('No se pudo cargar el generador PDF');
      return;
    }

    const doc = new jsPDF();
    const cliente = boleta.cliente || {};
    const evento = boleta.evento || {};
    const servicios = serviciosBoleta(boleta);
    const fechaHora = boleta.created_at ? new Date(boleta.created_at) : new Date();

    doc.setFontSize(16);
    doc.text('Memory Events', 14, 18);
    doc.setFontSize(11);
    doc.text(`Boleta N° ${boleta.numero}`, 14, 26);
    doc.text(`${Fmt.date(boleta.created_at || boleta.fecha)}  ${fechaHora.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })}`, 130, 18);
    doc.setFontSize(10);
    doc.text(`Cliente: ${cliente.nombre || '—'}`, 14, 36);
    doc.text(`Email: ${cliente.email || '—'}`, 14, 42);
    doc.text(`Evento: ${evento.nombre || '—'}`, 14, 50);
    doc.text(`Tipo: ${evento.tipo?.nombre || evento.tipo || '—'}`, 14, 56);
    doc.autoTable({
      startY: 64,
      head: [['Servicio', 'Cant.', 'Precio', 'Subtotal', 'Observaciones']],
      body: servicios.map(s => [s.nombre, String(s.cantidad), Fmt.currency(s.precio), Fmt.currency(s.subtotal), s.observaciones || '—']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [201, 163, 90] },
    });

    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Subtotal: ${Fmt.currency(boleta.subtotal)}`, 140, y);
    doc.text(`Impuestos: ${Fmt.currency(boleta.impuestos)}`, 140, y + 6);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${Fmt.currency(boleta.total)}`, 140, y + 12);
    doc.setFont(undefined, 'normal');
    doc.text(`Monto pagado: ${Fmt.currency(boleta.monto_pagado)}`, 140, y + 20);
    doc.text(`Saldo pendiente: ${Fmt.currency(boleta.saldo_pendiente)}`, 140, y + 26);
    doc.save(`boleta-${boleta.numero}.pdf`);
  };

  return { templateHTML, abrirPreview, cerrarPreview, imprimir, descargarPDF };
})();
