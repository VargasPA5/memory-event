/* ── calendarRealtime.js ───────────────────────────────────────────────────
   Preparado para Supabase Realtime. No se activa en esta fase. */

export const createCalendarRealtime = () => {
  const channels = new Set();
  return {
    start() {
      return null;
    },
    stop() {
      channels.clear();
    },
    subscribe(channel) {
      if (channel) channels.add(channel);
      return channel;
    },
    unsubscribe(channel) {
      if (channel) channels.delete(channel);
    },
  };
};
