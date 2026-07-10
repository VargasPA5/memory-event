/* ── configuracionService.js ─────────────────────────────────────────────
   Capa de acceso a datos para `configuracion_sistema` (fila única, id = 1).
   RLS: lectura abierta, escritura solo Administrador (es_administrador()).
   El logo se sube como archivo físico a Supabase Storage (bucket público
   `business`, RLS sobre storage.objects restringida a Administrador); su
   metadata (logo_url, logo_storage_path) siempre vive en esta tabla. */

import { supabase } from '../supabaseClient.js';

const CAMPOS = 'id, nombre_sistema, moneda, zona_horaria, porcentaje_impuesto, formato_fecha, razon_social, ruc, telefono, email, direccion, web, logo_url, logo_storage_path, updated_at';

const CAMPOS_EDITABLES = [
  'nombre_sistema', 'moneda', 'zona_horaria', 'porcentaje_impuesto', 'formato_fecha',
  'razon_social', 'ruc', 'telefono', 'email', 'direccion', 'web',
];

const LOGO_BUCKET = 'business';
const MAX_LOGO_MB = 5;
const TIPOS_LOGO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

const _err = (error, contexto) => {
  console.error(`[configuracionService] ${contexto}:`, error);
  return error?.message || 'Error inesperado';
};

/* No existe trigger de `updated_at`/`updated_by` para esta tabla (verificado
   en 20260709000006_triggers.sql), así que cada escritura los fija a mano. */
const _sello = async () => {
  const { data: authData } = await supabase.auth.getUser();
  return { updated_at: new Date().toISOString(), updated_by: authData?.user?.id || null };
};

export const getConfiguracion = async () => {
  const { data, error } = await supabase
    .from('configuracion_sistema')
    .select(CAMPOS)
    .eq('id', 1)
    .maybeSingle();
  if (error) return { data: null, error: _err(error, 'getConfiguracion') };
  return { data, error: null };
};

export const actualizarConfiguracion = async (campos) => {
  const payload = {};
  CAMPOS_EDITABLES.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(campos, k)) payload[k] = campos[k];
  });
  if (!Object.keys(payload).length) return { data: null, error: 'Nada que actualizar' };

  const { data, error } = await supabase
    .from('configuracion_sistema')
    .update({ ...payload, ...(await _sello()) })
    .eq('id', 1)
    .select(CAMPOS)
    .single();
  if (error) return { data: null, error: _err(error, 'actualizarConfiguracion') };
  return { data, error: null };
};

export const obtenerLogo = async () => {
  const { data, error } = await supabase
    .from('configuracion_sistema')
    .select('logo_url, logo_storage_path')
    .eq('id', 1)
    .maybeSingle();
  if (error) return { data: null, error: _err(error, 'obtenerLogo') };
  return { data, error: null };
};

export const actualizarLogo = async (logoUrl, logoStoragePath) => {
  const { data, error } = await supabase
    .from('configuracion_sistema')
    .update({ logo_url: logoUrl, logo_storage_path: logoStoragePath, ...(await _sello()) })
    .eq('id', 1)
    .select(CAMPOS)
    .single();
  if (error) return { data: null, error: _err(error, 'actualizarLogo') };
  return { data, error: null };
};

/* Sube el archivo físico a Supabase Storage (bucket `business`) y guarda su
   metadata en `configuracion_sistema`. Borra el logo anterior en Storage
   solo después de que la metadata nueva quedó confirmada, para no dejar
   la fila apuntando a un archivo ya borrado si algo falla a mitad de camino. */
export const subirLogo = async (file) => {
  if (!TIPOS_LOGO_PERMITIDOS.includes(file.type)) {
    return { data: null, error: 'Solo se permiten imágenes JPG, PNG o WebP' };
  }
  if (file.size > MAX_LOGO_MB * 1024 * 1024) {
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    return { data: null, error: `El logo no debe superar ${MAX_LOGO_MB}MB (tu archivo pesa ${mb}MB)` };
  }

  const { data: previo } = await obtenerLogo();

  const path = `sistema/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) return { data: null, error: _err(uploadError, 'subirLogo.upload') };

  const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  const { data, error } = await actualizarLogo(url, path);
  if (error) {
    await supabase.storage.from(LOGO_BUCKET).remove([path]).catch(() => {});
    return { data: null, error };
  }

  if (previo?.logo_storage_path) {
    const { error: delError } = await supabase.storage.from(LOGO_BUCKET).remove([previo.logo_storage_path]);
    if (delError) console.warn('[configuracionService] No se pudo borrar el logo anterior en Storage:', delError);
  }

  return { data: { url, path, configuracion: data }, error: null };
};

export const eliminarLogo = async () => {
  const { data: previo } = await obtenerLogo();
  const { data, error } = await actualizarLogo('', '');
  if (error) return { data: null, error };

  if (previo?.logo_storage_path) {
    const { error: delError } = await supabase.storage.from(LOGO_BUCKET).remove([previo.logo_storage_path]);
    if (delError) console.warn('[configuracionService] No se pudo borrar el logo en Storage:', delError);
  }

  return { data, error: null };
};
