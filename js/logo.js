/* ── logo.js — Logo del sistema, compartido por toda la app ───────────
   Cachea el logo en localStorage para pintarlo al instante y lo sincroniza
   con `configuracion_sistema` en Supabase. localStorage se usa solo como
   caché visual, nunca como fuente de negocio. */
const AppLogo = (() => {
  const KEY = 'ep:logo'; // { url, path } | null
  const listeners = [];

  const readCache = () => {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  };
  const writeCache = (data) => {
    try { data ? localStorage.setItem(KEY, JSON.stringify(data)) : localStorage.removeItem(KEY); } catch {}
  };

  let current = readCache();

  const applyFavicon = (url) => {
    let link = document.querySelector('link[rel="icon"]');
    if (url) {
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = url;
    } else if (link) {
      link.remove();
    }
  };

  const notify = () => listeners.forEach(fn => { try { fn(current); } catch {} });

  const get = () => current;

  const setLocal = (data) => {
    current = data || null;
    writeCache(current);
    applyFavicon(current?.url || '');
    notify();
  };

  const onChange = (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); };

  const paintInto = (selector) => {
    if (!current?.url) return;
    document.querySelectorAll(selector).forEach(el => {
      el.innerHTML = `<img src="${current.url}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:inherit"/>`;
    });
  };

  const syncFromSupabase = async () => {
    try {
      const { supabase } = await import('./supabaseClient.js');
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('logo_url, logo_storage_path')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      const next = data?.logo_url ? { url: data.logo_url, path: data.logo_storage_path || '' } : null;
      if (JSON.stringify(next) !== JSON.stringify(current)) setLocal(next);
    } catch (err) {
      console.warn('No se pudo sincronizar el logo del sistema con Supabase', err);
    }
  };

  if (current?.url) applyFavicon(current.url);
  syncFromSupabase();

  return { get, setLocal, onChange, paintInto, syncFromSupabase };
})();
