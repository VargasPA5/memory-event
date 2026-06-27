/* ── logo.js — Logo del sistema, compartido por toda la app ───────────
   Patrón análogo a theme.js: cachea el logo en localStorage para pintarlo
   al instante (sidebar, login, landing, favicon) y lo sincroniza con el
   documento Firestore `config/sistema` en segundo plano. La subida real
   (Storage + Firestore + borrado de archivos huérfanos) vive en
   configuracion.html, que es la única vista con permiso para cambiarla;
   este módulo solo expone lectura + notificación de cambios. */
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

  /* Actualiza caché local + favicon + notifica a los suscriptores de esta
     pestaña (usado por configuracion.html justo después de subir/borrar). */
  const setLocal = (data) => {
    current = data || null;
    writeCache(current);
    applyFavicon(current?.url || '');
    notify();
  };

  const onChange = (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); };

  /* Reemplaza el contenido de los contenedores de marca (logo "M" por
     defecto) con el logo subido, si existe. Para usar en páginas estáticas
     como login.html / index.html que no reconstruyen su HTML dinámicamente. */
  const paintInto = (selector) => {
    if (!current?.url) return;
    document.querySelectorAll(selector).forEach(el => {
      el.innerHTML = `<img src="${current.url}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:inherit"/>`;
    });
  };

  const syncFromFirestore = async () => {
    try {
      const [{ db }, fsMod] = await Promise.all([
        import('./firebase.js'),
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
      ]);
      const snap = await fsMod.getDoc(fsMod.doc(db, 'config', 'sistema'));
      const data = snap.exists() ? snap.data() : null;
      const next = data?.logoUrl ? { url: data.logoUrl, path: data.logoPath || '' } : null;
      if (JSON.stringify(next) !== JSON.stringify(current)) setLocal(next);
    } catch (err) {
      console.warn('No se pudo sincronizar el logo del sistema con Firebase', err);
    }
  };

  if (current?.url) applyFavicon(current.url);
  syncFromFirestore();

  return { get, setLocal, onChange, paintInto, syncFromFirestore };
})();
