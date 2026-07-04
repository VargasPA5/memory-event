/* ── Boletas de pago ───────────────────────────────────────────────────
   Módulo reutilizable: genera, previsualiza, imprime y exporta a PDF una
   boleta cada vez que se registra un pago (ver ingresos.html). El historial
   por cliente se consulta desde clientes.html. Sigue el mismo patrón que
   Toast/Confirm en ui.js: crea su propio DOM on-demand, sin depender de
   markup declarado en cada página anfitriona. */
const Boletas = (() => {

  /* ── Numeración correlativa ──────────────────────────────────────────── */
  const nextNumero = () => {
    const boletas = Data.boletas.getAll();
    const max = boletas.reduce((m, b) => Math.max(m, parseInt((b.numero || 'BOL-000').split('-')[1] || 0)), 0);
    return 'BOL-' + String(max + 1).padStart(3, '0');
  };

  /* ── Crear boleta a partir de un ingreso recién registrado ──────────── */
  const crear = (ingreso) => {
    const reserva = ingreso.reservaId ? Data.reservas.find(ingreso.reservaId) : null;
    const evento  = reserva?.eventoId ? Data.eventos.find(reserva.eventoId) : null;

    const servicios = (reserva?.servicios?.length ? reserva.servicios : [{
      nombre: reserva ? `Reserva ${reserva.codigo || ''}`.trim() : (ingreso.concepto || 'Pago'),
      cantidad: 1,
      precio: reserva ? (reserva.total || 0) : (ingreso.monto || 0),
      subtotal: reserva ? (reserva.total || 0) : (ingreso.monto || 0),
      observaciones: '',
    }]).map(s => ({
      nombre: s.nombre || '—',
      cantidad: s.cantidad || 1,
      precio: s.precio || 0,
      subtotal: s.subtotal != null ? s.subtotal : (s.precio || 0) * (s.cantidad || 1),
      observaciones: s.observaciones || '',
    }));

    const subtotal = servicios.reduce((s, x) => s + (x.subtotal || 0), 0);

    const boleta = Data.boletas.create({
      numero: nextNumero(),
      ingresoId: ingreso.id,
      clienteId: ingreso.clienteId,
      reservaId: ingreso.reservaId || null,
      eventoId: evento?.id || null,
      fecha: ingreso.fecha || new Date().toISOString(),
      servicios,
      subtotal,
      impuestos: 0,
      total: subtotal,
      montoPagado: ingreso.monto || 0,
      saldoPendiente: reserva ? (reserva.saldo || 0) : 0,
    });
    return boleta;
  };

  /* ── Buscar boleta asociada a un ingreso ─────────────────────────────── */
  const porIngreso = (ingresoId) => Data.boletas.getAll().find(b => b.ingresoId === ingresoId) || null;
  const porCliente = (clienteId) => Data.boletas.getAll()
    .filter(b => b.clienteId === clienteId)
    .sort((a, b) => new Date(b.createdAt || b.fecha || 0) - new Date(a.createdAt || a.fecha || 0));

  /* ── Template HTML de la boleta ──────────────────────────────────────── */
  const templateHTML = (boleta) => {
    const cliente = Data.clientes.find(boleta.clienteId);
    const evento  = boleta.eventoId ? Data.eventos.find(boleta.eventoId) : null;
    const reserva = boleta.reservaId ? Data.reservas.find(boleta.reservaId) : null;
    const fechaHora = boleta.createdAt ? new Date(boleta.createdAt) : new Date();

    const filasServicios = boleta.servicios.map(s => `
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
          <p><strong>${escHtml(cliente?.nombre || '—')}</strong></p>
          <p>${escHtml(cliente?.email || '—')}</p>
          <p>${escHtml(cliente?.telefono || '—')}</p>
          <p>${escHtml(cliente?.direccion || '—')}</p>
        </div>
        <div class="boleta-box">
          <h4>Datos del evento</h4>
          <p><strong>${escHtml(evento?.nombre || '—')}</strong></p>
          <p>${escHtml(evento?.tipo || '—')}</p>
          <p>${evento?.fecha ? Fmt.date(evento.fecha) : '—'}</p>
          <p>${escHtml(evento?.lugar || '—')}</p>
          ${reserva ? `<p>Reserva ${escHtml(reserva.codigo || '')}</p>` : ''}
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
        <div class="boleta-pagado"><span>Monto pagado</span><span>${Fmt.currency(boleta.montoPagado)}</span></div>
        <div><span>Saldo pendiente</span><span style="color:${boleta.saldoPendiente > 0 ? 'var(--red)' : 'var(--green)'}">${Fmt.currency(boleta.saldoPendiente)}</span></div>
      </div>`;
  };

  /* ── Preview modal (creado on-demand, un único overlay reutilizado) ─── */
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
    ov.querySelector('#boletaImprimirBtn').onclick = () => imprimir(boleta);
    ov.querySelector('#boletaPdfBtn').onclick = () => descargarPDF(boleta);
    ov.classList.add('modal-overlay--open');
  };

  /* ── Imprimir (usa reglas @media print acotadas a #boletaPrintArea) ─── */
  const imprimir = (boleta) => window.print();

  /* ── Descargar PDF (jsPDF + autoTable, cargados por CDN) ─────────────── */
  const descargarPDF = (boleta) => {
    const cliente = Data.clientes.find(boleta.clienteId);
    const evento  = boleta.eventoId ? Data.eventos.find(boleta.eventoId) : null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const fechaHora = boleta.createdAt ? new Date(boleta.createdAt) : new Date();
    doc.setFontSize(16);
    doc.text('Memory Events', 14, 18);
    doc.setFontSize(11);
    doc.text(`Boleta N° ${boleta.numero}`, 14, 26);
    doc.text(`${Fmt.date(boleta.createdAt)}  ${fechaHora.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })}`, 130, 18);

    doc.setFontSize(10);
    doc.text(`Cliente: ${cliente?.nombre || '—'}`, 14, 36);
    doc.text(`Email: ${cliente?.email || '—'}`, 14, 42);
    doc.text(`Evento: ${evento?.nombre || '—'}`, 14, 50);
    doc.text(`Tipo: ${evento?.tipo || '—'}`, 14, 56);

    doc.autoTable({
      startY: 64,
      head: [['Servicio', 'Cant.', 'Precio', 'Subtotal', 'Observaciones']],
      body: boleta.servicios.map(s => [s.nombre, String(s.cantidad), Fmt.currency(s.precio), Fmt.currency(s.subtotal), s.observaciones || '—']),
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
    doc.text(`Monto pagado: ${Fmt.currency(boleta.montoPagado)}`, 140, y + 20);
    doc.text(`Saldo pendiente: ${Fmt.currency(boleta.saldoPendiente)}`, 140, y + 26);

    doc.save(`boleta-${boleta.numero}.pdf`);
  };

  return { crear, porIngreso, porCliente, templateHTML, abrirPreview, cerrarPreview, imprimir, descargarPDF };
})();
