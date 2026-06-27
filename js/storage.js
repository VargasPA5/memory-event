const Storage = (() => {
  const get = (key, def = null) => {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : def;
    } catch { return def; }
  };

  const set = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  };

  const remove = (key) => localStorage.removeItem(key);

  return { get, set, remove };
})();
