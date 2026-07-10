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
//
// El correo de invitación NO lo manda Supabase Auth (su mailer integrado
// tiene un límite muy bajo en el plan gratuito): se genera el link con
// generateLink (no envía nada) y se manda por Resend en su lugar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

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

    // generateLink crea el usuario y el link de invitación pero NO envía
    // ningún correo (a diferencia de inviteUserByEmail).
    const { data: invited, error: inviteErr } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { nombre: body.nombre || "" },
        // Adónde apunta el link una vez que Supabase autentica al usuario.
        redirectTo: "https://vargaspa5.github.io/memory-event/login.html",
      },
    });
    if (inviteErr) return jsonError(inviteErr.message, 400);

    const actionLink = invited.properties?.action_link;

    // El correo sí lo manda Resend (el mailer integrado de Supabase Auth
    // tiene un límite muy bajo en el plan gratuito).
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Remitente de pruebas de Resend: no requiere verificar dominio,
        // pero solo entrega al correo con el que te registraste en Resend.
        // Para invitar a cualquier persona hay que verificar un dominio
        // propio en Resend y cambiar este remitente.
        from: "Memory <onboarding@resend.dev>",
        to: email,
        subject: "Invitación a Memory — define tu contraseña",
        html: `
          <p>Hola${body.nombre ? " " + body.nombre : ""},</p>
          <p>Un administrador te invitó a unirte a Memory como planificador.</p>
          <p><a href="${actionLink}">Haz clic aquí para definir tu contraseña</a></p>
          <p>Si no esperabas este correo, puedes ignorarlo.</p>
        `,
      }),
    });
    if (!resendRes.ok) {
      const detalle = await resendRes.text();
      return jsonError(`No se pudo enviar el correo de invitación: ${detalle}`, 502);
    }

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
