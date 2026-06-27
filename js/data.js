/* ── Capa de datos compartida ─────────────────────────────────────────── */
const Data = (() => {
  const K = {
    CLIENTES:    'ep:clientes',
    EVENTOS:     'ep:eventos',
    RESERVAS:    'ep:reservas',
    INGRESOS:    'ep:ingresos',
    PROVEEDORES: 'ep:proveedores',
    USUARIOS:    'ep:usuarios',
    META:        'ep:meta',
  };

  /* ── Datos de muestra ───────────────────────────────────────────────── */
  const SEED = {
    clientes: [
      { id:1, nombre:'Carlos Martínez', tipo:'Persona',  email:'carlos@email.com',   telefono:'987 654 321', direccion:'Av. Los Laureles 123, Lima',    fechaNacimiento:'1990-05-14', createdAt:'2024-01-10T08:00:00Z' },
      { id:2, nombre:'María López',     tipo:'Persona',  email:'maria@email.com',    telefono:'987 111 222', direccion:'Jr. Cusco 456, Arequipa',        fechaNacimiento:'1985-09-22', createdAt:'2024-01-15T09:00:00Z' },
      { id:3, nombre:'Ana Torres',      tipo:'Persona',  email:'ana@email.com',      telefono:'987 333 444', direccion:'Ca. Las Flores 78, Trujillo',    fechaNacimiento:'1993-03-11', createdAt:'2024-02-05T10:00:00Z' },
      { id:4, nombre:'Luis Ramírez',    tipo:'Persona',  email:'luis@email.com',     telefono:'987 555 666', direccion:'Av. República 200, Lima',        fechaNacimiento:'1988-12-30', createdAt:'2024-02-20T11:00:00Z' },
      { id:5, nombre:'Empresa XYZ SAC', tipo:'Empresa',  email:'contacto@xyz.com',   telefono:'987 777 888', direccion:'Av. Industrial 900, Lima',       fechaNacimiento:'',           createdAt:'2024-03-01T08:00:00Z' },
      { id:6, nombre:'Empresa ABC Corp',tipo:'Empresa',  email:'info@abc.com',       telefono:'987 999 000', direccion:'Calle Comercial 45, Lima',       fechaNacimiento:'',           createdAt:'2024-03-10T09:00:00Z' },
    ],
    eventos: [
      { id:1, nombre:'Boda de Ana y Luis',      tipo:'Boda',         clienteId:1, fecha:'2024-05-25', hora:'17:00', lugar:'Salón Grand Palace',        invitados:150, estado:'Confirmado', presupuesto:8500,  notas:'',  createdAt:'2024-04-01T10:00:00Z' },
      { id:2, nombre:'Cumpleaños de María',      tipo:'Cumpleaños',   clienteId:2, fecha:'2024-05-28', hora:'15:00', lugar:'Casa Club Los Pinos',       invitados:50,  estado:'Confirmado', presupuesto:2200,  notas:'',  createdAt:'2024-04-05T10:00:00Z' },
      { id:3, nombre:'Evento Corporativo XYZ',   tipo:'Corporativo',  clienteId:5, fecha:'2024-05-30', hora:'09:00', lugar:'Hotel Lima Sheraton',       invitados:80,  estado:'Pendiente',  presupuesto:5600,  notas:'',  createdAt:'2024-04-10T10:00:00Z' },
      { id:4, nombre:'Fiesta de Graduación',     tipo:'Graduación',   clienteId:4, fecha:'2024-06-01', hora:'18:00', lugar:'Salón Los Jardines',        invitados:120, estado:'Cancelado',  presupuesto:3800,  notas:'',  createdAt:'2024-04-12T10:00:00Z' },
      { id:5, nombre:'Aniversario Empresa ABC',  tipo:'Corporativo',  clienteId:6, fecha:'2024-06-05', hora:'19:00', lugar:'Centro de Convenciones',    invitados:100, estado:'Confirmado', presupuesto:7200,  notas:'',  createdAt:'2024-04-15T10:00:00Z' },
      { id:6, nombre:'Quinceañero de Lucía',     tipo:'Quinceañero',  clienteId:3, fecha:'2024-06-15', hora:'20:00', lugar:'Salón Versailles',          invitados:200, estado:'Pendiente',  presupuesto:4500,  notas:'',  createdAt:'2024-04-20T10:00:00Z' },
    ],
    reservas: [
      { id:1, codigo:'RES-001', eventoId:1, clienteId:1, fecha:'2024-05-25', estado:'Confirmado', total:6500, adelanto:3250, saldo:3250, notas:'', createdAt:'2024-04-01T10:00:00Z' },
      { id:2, codigo:'RES-002', eventoId:2, clienteId:2, fecha:'2024-05-28', estado:'Confirmado', total:2200, adelanto:1100, saldo:1100, notas:'', createdAt:'2024-04-05T10:00:00Z' },
      { id:3, codigo:'RES-003', eventoId:3, clienteId:5, fecha:'2024-05-30', estado:'Pendiente',  total:5600, adelanto:2800, saldo:2800, notas:'', createdAt:'2024-04-10T10:00:00Z' },
      { id:4, codigo:'RES-004', eventoId:4, clienteId:4, fecha:'2024-06-01', estado:'Cancelado',  total:3800, adelanto:1900, saldo:1900, notas:'', createdAt:'2024-04-12T10:00:00Z' },
      { id:5, codigo:'RES-005', eventoId:5, clienteId:6, fecha:'2024-06-05', estado:'Confirmado', total:7200, adelanto:3600, saldo:3600, notas:'', createdAt:'2024-04-15T10:00:00Z' },
      { id:6, codigo:'RES-006', eventoId:6, clienteId:3, fecha:'2024-06-15', estado:'Pendiente',  total:4500, adelanto:2250, saldo:2250, notas:'', createdAt:'2024-04-20T10:00:00Z' },
    ],
    ingresos: [
      { id:1, codigo:'PAG-001', reservaId:1, clienteId:1, concepto:'Adelanto RES-001', monto:3250, fecha:'2024-05-20', metodo:'Transferencia', estado:'Pagado',   createdAt:'2024-05-20T10:00:00Z' },
      { id:2, codigo:'PAG-002', reservaId:1, clienteId:1, concepto:'Saldo RES-001',    monto:3250, fecha:'2024-05-25', metodo:'Transferencia', estado:'Pagado',   createdAt:'2024-05-25T10:00:00Z' },
      { id:3, codigo:'PAG-003', reservaId:2, clienteId:2, concepto:'Adelanto RES-002', monto:1100, fecha:'2024-05-18', metodo:'Efectivo',      estado:'Pagado',   createdAt:'2024-05-18T10:00:00Z' },
      { id:4, codigo:'PAG-004', reservaId:2, clienteId:2, concepto:'Saldo RES-002',    monto:1100, fecha:'2024-05-28', metodo:'Efectivo',      estado:'Pendiente',createdAt:'2024-05-28T10:00:00Z' },
      { id:5, codigo:'PAG-005', reservaId:3, clienteId:5, concepto:'Adelanto RES-003', monto:2800, fecha:'2024-05-15', metodo:'Transferencia', estado:'Pagado',   createdAt:'2024-05-15T10:00:00Z' },
      { id:6, codigo:'PAG-006', reservaId:5, clienteId:6, concepto:'Adelanto RES-005', monto:3600, fecha:'2024-05-10', metodo:'Transferencia', estado:'Pagado',   createdAt:'2024-05-10T10:00:00Z' },
      { id:7, codigo:'PAG-007', reservaId:5, clienteId:6, concepto:'Saldo RES-005',    monto:3600, fecha:'2024-06-05', metodo:'Transferencia', estado:'Pendiente',createdAt:'2024-06-05T10:00:00Z' },
      { id:8, codigo:'PAG-008', reservaId:6, clienteId:3, concepto:'Adelanto RES-006', monto:2250, fecha:'2024-06-10', metodo:'Efectivo',      estado:'Pendiente',createdAt:'2024-06-10T10:00:00Z' },
    ],
    proveedores: [
      { id:1, nombre:'Decoraciones Elegantes', tipo:'Decoración',   contacto:'Ana García',   telefono:'987 111 222', email:'ana@decoraciones.com',  estado:'Activo',   createdAt:'2024-01-10T10:00:00Z' },
      { id:2, nombre:'Catering Delicioso',      tipo:'Catering',     contacto:'Luis Martínez',telefono:'987 333 444', email:'catering@dlicioso.com', estado:'Activo',   createdAt:'2024-01-15T10:00:00Z' },
      { id:3, nombre:'Música & Sonido Pro',     tipo:'Música',       contacto:'Carlos Ruiz',  telefono:'987 555 666', email:'carlos@musica.com',     estado:'Activo',   createdAt:'2024-02-01T10:00:00Z' },
      { id:4, nombre:'Fotografía Flash',        tipo:'Fotografía',   contacto:'María Silva',  telefono:'987 777 888', email:'maria@flash.com',       estado:'Inactivo', createdAt:'2024-02-10T10:00:00Z' },
      { id:5, nombre:'Eventos & Más',           tipo:'Coordinación', contacto:'Pedro López',  telefono:'987 999 000', email:'pedro@eventosmas.com',  estado:'Activo',   createdAt:'2024-03-01T10:00:00Z' },
    ],
    usuarios: [
      { id:1, username:'admin',  nombre:'Administrador', email:'admin@eventos.com',  rol:'Administrador', estado:'Activo', cargo:'Administrador del sistema', telefono:'', avatar:'https://i.pravatar.cc/34?img=68', passwordHash:btoa('admin123'),    createdAt:'2024-01-01T00:00:00Z' },
      { id:2, username:'mlopez', nombre:'María López',   email:'maria@eventos.com',  rol:'Empleado',      estado:'Activo', cargo:'Planificadora de eventos',  telefono:'987 111 222', avatar:'https://i.pravatar.cc/34?img=9',  passwordHash:btoa('empleado123'), createdAt:'2024-01-05T00:00:00Z' },
      { id:3, username:'jperez', nombre:'Juan Pérez',    email:'juan@eventos.com',   rol:'Empleado',      estado:'Activo', cargo:'Coordinador de logística',  telefono:'987 333 444', avatar:'https://i.pravatar.cc/34?img=3',  passwordHash:btoa('empleado123'), createdAt:'2024-01-10T00:00:00Z' },
    ],
  };

  /* ── Inicialización ─────────────────────────────────────────────────── */
  const DEFAULT_PWD = { admin: 'admin123', mlopez: 'empleado123', jperez: 'empleado123' };

  const init = () => {
    const meta = Storage.get(K.META, {});
    if (!meta.initialized) {
      Object.keys(SEED).forEach(entity => {
        const key = K[entity.toUpperCase()];
        if (Storage.get(key) === null) Storage.set(key, SEED[entity]);
      });
      Storage.set(K.META, { initialized: true, version: '2.0', date: new Date().toISOString() });
    }

    // Migrar usuarios existentes que no tengan passwordHash
    const us = Storage.get(K.USUARIOS, []);
    let changed = false;
    us.forEach(u => {
      if (!u.passwordHash && DEFAULT_PWD[u.username]) {
        u.passwordHash = btoa(DEFAULT_PWD[u.username]);
        changed = true;
      }
    });
    if (changed) Storage.set(K.USUARIOS, us);

    // Sincronización con Firebase en segundo plano (no bloquea el primer render)
    syncFromFirestore();
  };

  /* ── Firebase Firestore: caché local + sincronización ─────────────────
     Cada módulo (clientes, eventos, reservas, ingresos, proveedores,
     usuarios) es una colección de Firestore. El documento usa el mismo id
     numérico que el registro local, así las relaciones (clienteId,
     eventoId, reservaId, etc.) se mantienen idénticas entre ambos lados. */
  const FS_NAME = {
    [K.CLIENTES]:    'clientes',
    [K.EVENTOS]:     'eventos',
    [K.RESERVAS]:    'reservas',
    [K.INGRESOS]:    'ingresos',
    [K.PROVEEDORES]: 'proveedores',
    [K.USUARIOS]:    'usuarios',
  };

  let _db = null, _fs = null;
  const _fsReady = (async () => {
    try {
      const [{ db, auth }, fsMod, authMod] = await Promise.all([
        import('./firebase.js'),
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      ]);
      /* auth.currentUser puede ser null justo después de getAuth() aunque
         exista una sesión persistida: el SDK todavía no terminó de
         restaurarla desde IndexedDB. Si no esperamos ese primer evento,
         este código cree que no hay sesión y crea una anónima, pisando la
         sesión real del usuario que inició sesión en login.html (y con
         ella, el uid que usan las reglas de seguridad de Storage/Firestore). */
      const current = await new Promise(resolve => {
        const unsub = authMod.onAuthStateChanged(auth, user => { unsub(); resolve(user); });
      });
      if (!current) await authMod.signInAnonymously(auth);
      _db = db;
      _fs = fsMod;
      return true;
    } catch (err) {
      console.warn('Firebase no disponible, usando solo almacenamiento local', err);
      return false;
    }
  })();

  const _colRef = (k) => _fs.collection(_db, FS_NAME[k]);
  const _docRef = (k, id) => _fs.doc(_db, FS_NAME[k], String(id));

  const _pushItem = async (k, item) => {
    if (!FS_NAME[k] || !(await _fsReady)) return;
    try { await _fs.setDoc(_docRef(k, item.id), item); }
    catch (err) { console.warn(`No se pudo guardar en Firebase (${FS_NAME[k]})`, err); }
  };

  const _removeRemote = async (k, id) => {
    if (!FS_NAME[k] || !(await _fsReady)) return;
    try { await _fs.deleteDoc(_docRef(k, id)); }
    catch (err) { console.warn(`No se pudo eliminar en Firebase (${FS_NAME[k]})`, err); }
  };

  /* Trae las colecciones de Firestore a la caché local; si una colección
     todavía no existe en Firebase, la crea subiendo los datos locales. */
  const syncFromFirestore = async () => {
    if (!(await _fsReady)) return;
    for (const k of Object.keys(FS_NAME)) {
      try {
        const snap = await _fs.getDocs(_colRef(k));
        if (snap.empty) {
          const local = _all(k);
          if (local.length) await Promise.all(local.map(it => _pushItem(k, it)));
        } else {
          _save(k, snap.docs.map(d => ({ ...d.data(), id: Number(d.id) })));
        }
      } catch (err) { console.warn(`No se pudo sincronizar ${FS_NAME[k]} con Firebase`, err); }
    }
  };

  const pushAllToFirestore = async () => {
    for (const k of Object.keys(FS_NAME)) {
      await Promise.all(_all(k).map(it => _pushItem(k, it)));
    }
  };

  const clearFirestoreData = async () => {
    if (!(await _fsReady)) return;
    for (const k of Object.keys(FS_NAME)) {
      try {
        const snap = await _fs.getDocs(_colRef(k));
        await Promise.all(snap.docs.map(d => _fs.deleteDoc(d.ref)));
      } catch (err) { console.warn(`No se pudo limpiar ${FS_NAME[k]} en Firebase`, err); }
    }
  };

  /* ── CRUD genérico ──────────────────────────────────────────────────── */
  const _all  = k => Storage.get(k, []);
  const _save = (k, items) => Storage.set(k, items);

  const _nextId = k => {
    const items = _all(k);
    return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
  };

  const _create = (k, data) => {
    const items = _all(k);
    const item  = { ...data, id: _nextId(k), createdAt: new Date().toISOString() };
    items.push(item);
    _save(k, items);
    _pushItem(k, item);
    return item;
  };

  const _update = (k, id, changes) => {
    const items = _all(k);
    const idx   = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...changes, updatedAt: new Date().toISOString() };
    _save(k, items);
    _pushItem(k, items[idx]);
    return items[idx];
  };

  const _delete = (k, id) => {
    _save(k, _all(k).filter(i => i.id !== id));
    _removeRemote(k, id);
  };
  const _find   = (k, id) => _all(k).find(i => i.id === id) || null;

  /* ── Fábrica de módulos ─────────────────────────────────────────────── */
  const module = (k) => ({
    getAll:  ()         => _all(k),
    create:  (d)        => _create(k, d),
    update:  (id, c)    => _update(k, id, c),
    delete:  (id)       => _delete(k, id),
    find:    (id)       => _find(k, id),
    replace: (items)    => _save(k, items),
  });

  /* ── Estadísticas para dashboard y reportes ─────────────────────────── */
  const stats = () => {
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();

    const cl = _all(K.CLIENTES);
    const ev = _all(K.EVENTOS);
    const re = _all(K.RESERVAS);
    const ing = _all(K.INGRESOS); 
    const pr = _all(K.PROVEEDORES);

    const inMes = (d) => { const dt = new Date(d); return dt.getMonth()===m && dt.getFullYear()===y; };

    const totalIngresos = ing.filter(i=>i.estado==='Pagado').reduce((s,i)=>s+(i.monto||0),0);
    const ingresosMes   = ing.filter(i=>i.estado==='Pagado'&&inMes(i.fecha)).reduce((s,i)=>s+(i.monto||0),0);
    const pendientesCobro = ing.filter(i=>i.estado==='Pendiente').reduce((s,i)=>s+(i.monto||0),0);

    /* Ingresos por mes (últimos 6) */
    const ingresosPorMes = Array.from({length:6}).map((_,i) => {
      const d = new Date(y, m-5+i, 1);
      const mm = d.getMonth(), yy = d.getFullYear();
      const total = ing
        .filter(x => x.estado==='Pagado' && new Date(x.fecha).getMonth()===mm && new Date(x.fecha).getFullYear()===yy)
        .reduce((s,x)=>s+(x.monto||0),0);
      const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      return { label: meses[mm], total };
    });

    /* Eventos por tipo */
    const tiposEvento = {};
    ev.forEach(e => { tiposEvento[e.tipo] = (tiposEvento[e.tipo]||0)+1; });

    return {
      clientes:   { total:cl.length, personas:cl.filter(c=>c.tipo==='Persona').length, empresas:cl.filter(c=>c.tipo==='Empresa').length },
      eventos:    { total:ev.length, confirmados:ev.filter(e=>e.estado==='Confirmado').length, pendientes:ev.filter(e=>e.estado==='Pendiente').length, cancelados:ev.filter(e=>e.estado==='Cancelado').length, tipos:tiposEvento },
      reservas:   { total:re.length, confirmadas:re.filter(r=>r.estado==='Confirmado').length, pendientes:re.filter(r=>r.estado==='Pendiente').length, canceladas:re.filter(r=>r.estado==='Cancelado').length },
      ingresos:   { total:totalIngresos, esteMes:ingresosMes, pendientes:pendientesCobro, porMes:ingresosPorMes },
      proveedores:{ total:pr.length, activos:pr.filter(p=>p.estado==='Activo').length },
    };
  };

  /* ── Helpers de lookup ──────────────────────────────────────────────── */
  const clienteNombre = (id) => {
    const c = _find(K.CLIENTES, id);
    return c ? c.nombre : '—';
  };
  const eventoNombre = (id) => {
    const e = _find(K.EVENTOS, id);
    return e ? e.nombre : '—';
  };
  const reservaCodigo = (id) => {
    const r = _find(K.RESERVAS, id);
    return r ? r.codigo : '—';
  };

  /* ── Verificación de dependencias antes de eliminar ─────────────────── */
  const depCliente = (id) => ({
    eventos:  _all(K.EVENTOS).filter(e => e.clienteId === id).length,
    reservas: _all(K.RESERVAS).filter(r => r.clienteId === id).length,
    ingresos: _all(K.INGRESOS).filter(i => i.clienteId === id).length,
  });

  const depEvento = (id) => ({
    reservas: _all(K.RESERVAS).filter(r => r.eventoId === id).length,
  });

  const depReserva = (id) => ({
    ingresos: _all(K.INGRESOS).filter(i => i.reservaId === id).length,
  });

  /* ── Sincronizar saldo de reserva con ingresos reales ───────────────── */
  const sincronizarSaldoReserva = (reservaId) => {
    if (!reservaId) return;
    const reserva = _find(K.RESERVAS, reservaId);
    if (!reserva) return;
    const pagado = _all(K.INGRESOS)
      .filter(i => i.reservaId === reservaId && i.estado === 'Pagado')
      .reduce((s, i) => s + (i.monto || 0), 0);
    const saldo = Math.max(0, (reserva.total || 0) - pagado);
    _update(K.RESERVAS, reservaId, { saldo });
  };

  return {
    K,
    init,
    syncFromFirestore,
    pushAllToFirestore,
    clearFirestoreData,
    stats,
    clienteNombre,
    eventoNombre,
    reservaCodigo,
    depCliente,
    depEvento,
    depReserva,
    sincronizarSaldoReserva,
    clientes:    module(K.CLIENTES),
    eventos:     module(K.EVENTOS),
    reservas:    module(K.RESERVAS),
    ingresos:    module(K.INGRESOS),
    proveedores: module(K.PROVEEDORES),
    usuarios:    module(K.USUARIOS),
  };
})();
