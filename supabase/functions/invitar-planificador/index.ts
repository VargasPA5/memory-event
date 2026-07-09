// invitar-planificador — Edge Function
//
// Único punto del sistema que puede crear una cuenta de Supabase Auth para
// otra persona. Esto NO se puede hacer de forma segura desde el navegador:
// requiere la service_role key, que salta todas las políticas RLS y por eso
// nunca debe existir en código de cliente. Aquí vive server-side, y esta
// función verifica primero que quien llama sea un Administrador autenticado
// antes de usarla.
//
// Flujo: el admin llama a esta función (desde usuarios.html) con el email
// del nuevo planificador → se le envía un correo de invitación → al abrirlo
// llega autenticado a login.html, donde define su propia contraseña.
// fn_handle_new_user (trigger ya existente en la base de datos) crea la fila
// en `perfiles` automáticamente; esta función solo la ajusta después
// (rol/estado/cargo/teléfono) según lo que pidió el administrador.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const jsonError = (msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return jsonError("No autenticado", 401);

    // Cliente "como el que llama": respeta RLS, solo sirve para confirmar
    // la identidad y el rol de quien hace la solicitud.
    const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await asCaller.auth.getUser();
    if (userErr || !user) return jsonError("No autenticado", 401);

    const { data: perfilCaller } = await asCaller
      .from("perfiles").select("rol").eq("id", user.id).single();

    if (!perfilCaller || perfilCaller.rol !== "Administrador") {
      return jsonError("Solo un administrador puede invitar planificadores", 403);
    }

    const body = await req.json();
    const email = String(body.email || "").trim();
    if (!email) return jsonError("El correo es obligatorio", 400);

    // Cliente con service_role: existe únicamente en este entorno de
    // servidor. Es lo único capaz de crear la cuenta de otra persona.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nombre: body.nombre || "" },
    });
    if (inviteErr) return jsonError(inviteErr.message, 400);

    // fn_handle_new_user ya creó la fila en `perfiles` (rol Planificador,
    // estado Activo por defecto); se ajusta según lo pedido en el formulario.
    const cambios: Record<string, unknown> = {};
    if (body.nombre)   cambios.nombre = body.nombre;
    if (body.cargo)    cambios.cargo = body.cargo;
    if (body.telefono) cambios.telefono = body.telefono;
    if (body.rol)      cambios.rol = body.rol;       // 'Administrador' | 'Planificador'
    if (body.estado)   cambios.estado = body.estado; // 'Activo' | 'Inactivo'

    if (Object.keys(cambios).length > 0) {
      await admin.from("perfiles").update(cambios).eq("id", invited.user.id);
    }

    return new Response(JSON.stringify({ ok: true, id: invited.user.id }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(String(err), 500);
  }
});
