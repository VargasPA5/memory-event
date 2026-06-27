/* ── auth.js — Gestión de sesión y roles ─────────────────────────────── */
const Auth = (() => {
  const KEY = 'ep:session';

  const get = () => {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
  };

  const set = (user) => {
    const safe = {
      id:       user.id,
      nombre:   user.nombre   || '',
      username: user.username || '',
      email:    user.email    || '',
      rol:      user.rol      || 'Empleado',
      avatar:   user.avatar   || '',
      telefono: user.telefono || '',
      cargo:    user.cargo    || '',
    };
    sessionStorage.setItem(KEY, JSON.stringify(safe));
  };

  const clear = () => sessionStorage.removeItem(KEY);

  /* Redirige a login si no hay sesión activa */
  const require = () => {
    const u = get();
    if (!u) { window.location.replace('login.html'); return null; }
    return u;
  };

  /* Redirige al dashboard si el usuario no es administrador */
  const requireAdmin = () => {
    const u = require();
    if (u && u.rol !== 'Administrador') { window.location.replace('dashboard.html'); return null; }
    return u;
  };

  const login = (username, password) => {
    const users = Storage.get('ep:usuarios', []);
    const u = users.find(x => x.username === username && x.estado === 'Activo');
    if (!u) return { ok: false, error: 'Usuario no encontrado o cuenta inactiva' };
    if (u.passwordHash !== btoa(password)) return { ok: false, error: 'Contraseña incorrecta' };
    set(u);
    return { ok: true, user: u };
  };

  const logout = () => {
    clear();
    import('./firebase.js')
      .then(({ auth }) => import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
        .then(({ signOut }) => signOut(auth)))
      .catch(() => {})
      .finally(() => window.location.replace('login.html'));
  };

  const isAdmin = () => get()?.rol === 'Administrador';

  /* Refresca la sesión con los datos más recientes de localStorage */
  const refresh = () => {
    const cur = get();
    if (!cur) return;
    const fresh = Storage.get('ep:usuarios', []).find(u => u.id === cur.id);
    if (fresh) set(fresh);
  };

  return { get, set, clear, require, requireAdmin, login, logout, isAdmin, refresh };
})();
