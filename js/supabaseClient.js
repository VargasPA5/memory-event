import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── Reemplaza estos dos valores por los de tu proyecto Supabase ──────────
   (Project Settings → API, en el panel de Supabase). La anon key es pública
   por diseño: la seguridad real la dan las políticas RLS de la Fase 3, no
   el secreto de esta clave. */
const SUPABASE_URL = "https://ktcssyeoxirkzynlbmuh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y3NzeWVveGlya3p5bmxibXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Njg4NTEsImV4cCI6MjA5OTE0NDg1MX0.6UJhV12bSV-uEA0R6389MY2Svv6-QjPj8rrfodvlWBc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // true: necesario para que login.html pueda procesar el enlace de
    // invitación que manda la Edge Function invitar-planificador (llega con
    // el token de sesión en el hash de la URL).
    detectSessionInUrl: true,
  },
});

/* Se resuelve cuando supabase-js termina de restaurar la sesión guardada en
   localStorage y de adjuntarla a las peticiones. Las páginas deben esperar
   esta promesa antes de disparar su primera consulta: si consultan antes de
   que esto resuelva, la petición sale sin token y Postgres la trata como
   anónima (permission denied), aunque el usuario sí tenga sesión iniciada. */
export const sessionReady = supabase.auth.getSession();
