/* ── theme.js — ThemeProvider global (claro/oscuro) ───────────────────
   Se carga de forma síncrona en <head>, antes de pintar el body, para
   aplicar el tema sin parpadeo. Cualquier página/script puede leer o
   cambiar el tema con `Theme.get()` / `Theme.toggle()`, y reaccionar a
   cambios (p.ej. para repintar gráficos) suscribiéndose con
   `Theme.onChange(fn)` — así no hay que repetir la lógica en cada vista. */
const Theme = (() => {
  const KEY = 'ep:theme';
  const listeners = [];

  const systemPrefersDark = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const stored = () => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  };

  /* Tema resuelto: preferencia guardada > preferencia del sistema > claro */
  const resolve = () => stored() || (systemPrefersDark() ? 'dark' : 'light');

  const apply = (theme, { persist = true } = {}) => {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    if (persist) {
      try { localStorage.setItem(KEY, t); } catch {}
    }
    listeners.forEach(fn => { try { fn(t); } catch {} });
    return t;
  };

  const get = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

  const toggle = () => apply(get() === 'dark' ? 'light' : 'dark');

  const onChange = (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); };

  /* Aplicación inmediata (antes de pintar) usando el tema resuelto */
  apply(resolve(), { persist: false });

  /* Si el usuario nunca elegió tema explícitamente, sigue la preferencia del SO */
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!stored()) apply(e.matches ? 'dark' : 'light', { persist: false });
    });
  }

  return { get, apply, toggle, onChange };
})();
