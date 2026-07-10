// solicitar-resena — Edge Function
//
// El planificador presiona "Solicitar reseña" en un evento con estado
// Realizado (ver eventos.html). Esto crea (o reutiliza) la fila en `resenas`
// con un token aleatorio y le manda al cliente un correo con el link público
// resena.html?token=... — esa página no requiere cuenta, el cliente nunca
// tiene login en este sistema.
//
// A diferencia de invitar-planificador, aquí NO hace falta la service_role
// key: las políticas RLS de `resenas` ya permiten al dueño del evento (o a
// un administrador) leer/crear/actualizar sus propias filas, así que basta
// con un cliente que respete la sesión de quien llama. El único motivo por
// el que esto vive en una Edge Function es que el envío de correo (Resend)
// necesita una API key que nunca debe llegar al navegador.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITIO_BASE = "https://vargaspa5.github.io/memory-event";

function generarToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return jsonError("No autenticado", 401);

    // Cliente "como el que llama": respeta RLS de principio a fin en esta función.
    const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await asCaller.auth.getUser();
    if (userErr || !user) return jsonError("No autenticado", 401);

    const body = await req.json();
    const eventoId = Number(body.evento_id);
    if (!eventoId) return jsonError("evento_id es obligatorio", 400);

    const { data: evento, error: eventoErr } = await asCaller
      .from("eventos")
      .select("id, nombre, estado, cliente:clientes(id, nombre, email)")
      .eq("id", eventoId)
      .single();
    if (eventoErr || !evento) return jsonError("Evento no encontrado o sin permisos", 404);
    if (evento.estado !== "Realizado") {
      return jsonError("Solo se puede solicitar reseña de un evento Realizado", 400);
    }
    const cliente = Array.isArray(evento.cliente) ? evento.cliente[0] : evento.cliente;
    if (!cliente?.email) {
      return jsonError("El cliente de este evento no tiene correo registrado", 400);
    }

    // Reutiliza la solicitud si ya existe (evita duplicados por evento_id único).
    const { data: existente } = await asCaller
      .from("resenas")
      .select("id, token, estado")
      .eq("evento_id", eventoId)
      .maybeSingle();

    if (existente?.estado === "Publicada") {
      return jsonError("Este evento ya tiene una reseña publicada", 400);
    }

    let token: string;
    if (existente) {
      token = existente.token;
      await asCaller.from("resenas").update({ enviado_en: new Date().toISOString() }).eq("id", existente.id);
    } else {
      token = generarToken();
      const { error: crearErr } = await asCaller.from("resenas").insert({
        evento_id: eventoId,
        cliente_id: cliente.id,
        planificador_id: user.id,
        token,
        evento_nombre: evento.nombre,
      });
      if (crearErr) return jsonError(crearErr.message, 400);
    }

    const link = `${SITIO_BASE}/resena.html?token=${token}`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Memory <onboarding@resend.dev>",
        to: cliente.email,
        subject: `¿Cómo estuvo tu evento "${evento.nombre}"?`,
        html: `
          <p>Hola${cliente.nombre ? " " + cliente.nombre : ""},</p>
          <p>Gracias por confiar en nosotros para "${evento.nombre}". Nos encantaría conocer tu opinión.</p>
          <p><a href="${link}">Haz clic aquí para dejar tu reseña</a></p>
          <p>Toma menos de un minuto y nos ayuda muchísimo.</p>
        `,
      }),
    });
    if (!resendRes.ok) {
      const detalle = await resendRes.text();
      return jsonError(`No se pudo enviar el correo: ${detalle}`, 502);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(String(err), 500);
  }
});
