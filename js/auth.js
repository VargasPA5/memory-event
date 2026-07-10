/* ── auth.js — Gestión de sesión y roles (Supabase Auth + tabla perfiles) ──
   get/set/clear/require/requireAdmin/isAdmin se mantienen 100% síncronos
   (leen únicamente la caché en sessionStorage) para no romper app.js ni
   ninguna otra página que dependa de que el guard de acceso resuelva de
   inmediato, sin esperar red. login/logout/refresh/updatePerfil sí son
   asíncronos: hablan con Supabase.

   No existe autorregistro: no hay backend propio en este proyecto, así que
   no es seguro que un usuario cree su propia cuenta desde el navegador sin
   supervisión (cualquiera con la URL de login podría obtener acceso interno).
   Solo un administrador invita nuevos planificadores desde usuarios.html,
   vía la Edge Function invitar-planificador (usa la service_role key, que
   nunca se expone al cliente). El invitado define su contraseña al abrir el
   enlace del correo — ver login.html, modo "definir contraseña". */
const Auth = (() => {
  const KEY = 'ep:session';

  const get = () => {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
  };

  /* perfil: fila de la tabla `perfiles` (id, nombre, rol, cargo, telefono,
     avatar_url, estado). email no vive en `perfiles` (vive en auth.users),
     así que se recibe aparte. username no existe en el esquema nuevo; se
     deriva del email solo para no romper las pantallas que ya lo muestran
     (p. ej. perfil.html). */
  const set = (perfil, email) => {
    const safe = {
      id:       perfil.id,
      nombre:   perfil.nombre     || '',
      username: (email || '').split('@')[0] || '',
      email:    email || '',
      rol:      perfil.rol        || 'Planificador',
      avatar:   perfil.avatar_url || '',
      telefono: perfil.telefono   || '',
      cargo:    perfil.cargo      || '',
    };
    sessionStorage.setItem(KEY, JSON.stringify(safe));
    return safe;
  };

  const clear = () => sessionStorage.removeItem(KEY);

  /* Redirige a login si no hay sesión activa. Síncrono a propósito (ver
     comentario de cabecera) — no verifica contra Supabase en cada
     navegación, confía en la caché que dejó login()/register(). */
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

  const isAdmin = () => get()?.rol === 'Administrador';

  const _fetchPerfil = async (supabase, userId) => {
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  };

  const _mapAuthError = (error) => {
    const msg = error?.message || '';
    if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos';
    if (msg.includes('User already registered'))   return 'Ya existe una cuenta con ese correo';
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres';
    if (msg.includes('Unable to validate email address')) return 'Correo electrónico inválido';
    return msg || 'Ocurrió un error inesperado';
  };

  const login = async (email, password) => {
    const { supabase } = await import('./supabaseClient.js');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: _mapAuthError(error) };

    const perfil = await _fetchPerfil(supabase, data.user.id);
    if (!perfil) {
      await supabase.auth.signOut();
      return { ok: false, error: 'Tu cuenta no tiene un perfil asociado. Contacta al administrador.' };
    }
    if (perfil.estado !== 'Activo') {
      await supabase.auth.signOut();
      return { ok: false, error: 'Tu cuenta está inactiva. Contacta al administrador.' };
    }

    return { ok: true, user: set(perfil, data.user.email) };
  };

  const logout = async () => {
    clear();
    try {
      const { supabase } = await import('./supabaseClient.js');
      await supabase.auth.signOut();
    } catch { /* sin conexión: igual limpiamos la sesión local */ }
    window.location.replace('login.html');
  };

  /* Refresca la sesión con los datos más recientes de la tabla `perfiles` */
  const refresh = async () => {
    const cur = get();
    if (!cur) return;
    const { supabase } = await import('./supabaseClient.js');
    const perfil = await _fetchPerfil(supabase, cur.id);
    if (perfil) set(perfil, cur.email);
  };

  /* Actualiza campos propios (nombre/cargo/telefono) en `perfiles` y refresca
     la sesión. No incluye email: vive en auth.users y cambiarlo implica el
     flujo de verificación de Supabase, fuera del alcance de esta fase. */
  const updatePerfil = async (cambios) => {
    const cur = get();
    if (!cur) return { ok: false, error: 'No hay sesión activa' };
    const { supabase } = await import('./supabaseClient.js');
    const { error } = await supabase.from('perfiles').update(cambios).eq('id', cur.id);
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  };

  return { get, set, clear, require, requireAdmin, login, logout, isAdmin, refresh, updatePerfil };
})();
