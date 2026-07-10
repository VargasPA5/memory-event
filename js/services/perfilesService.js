/* ── perfilesService.js ────────────────────────────────────────────────────
   Capa de acceso a datos para `perfiles`.
   Supabase Auth conserva el correo; `perfiles` conserva metadata de usuario. */

import { supabase } from '../supabaseClient.js';

const _err = (error, contexto) => {
  console.error(`[perfilesService] ${contexto}:`, error);
  return error?.message || 'Error inesperado';
};

const _emailFromUser = (user) => user?.email || '';

const _withDerivedFields = (perfil, email = '') => ({
  ...perfil,
  email,
  username: email ? email.split('@')[0] : '',
  avatar: perfil?.avatar_url || '',
  createdAt: perfil?.created_at || null,
});

export const getPerfilActual = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return { data: null, error: _err(authError, 'getPerfilActual.auth') };
  const user = authData?.user;
  if (!user) return { data: null, error: 'No hay sesión activa' };

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, estado, cargo, telefono, avatar_url, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (error) return { data: null, error: _err(error, 'getPerfilActual') };
  return { data: _withDerivedFields(data, _emailFromUser(user)), error: null };
};

export const actualizarPerfil = async (campos, perfilId = null) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return { data: null, error: _err(authError, 'actualizarPerfil.auth') };
  const uid = perfilId || authData?.user?.id;
  if (!uid) return { data: null, error: 'No hay sesión activa' };

  const permitidos = ['nombre', 'cargo', 'telefono', 'avatar_url'];
  const payload = {};
  permitidos.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(campos, key)) payload[key] = campos[key];
  });

  const { data, error } = await supabase
    .from('perfiles')
    .update(payload)
    .eq('id', uid)
    .select('id, nombre, rol, estado, cargo, telefono, avatar_url, created_at, updated_at')
    .single();

  if (error) return { data: null, error: _err(error, 'actualizarPerfil') };
  return { data: _withDerivedFields(data, perfilId ? '' : _emailFromUser(authData.user)), error: null };
};

export const listarUsuarios = async () => {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, estado, cargo, telefono, avatar_url, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: _err(error, 'listarUsuarios') };
  return { data: (data || []).map((perfil) => _withDerivedFields(perfil)), error: null };
};

export const actualizarEstado = async (id, estado) => {
  const { data, error } = await supabase
    .from('perfiles')
    .update({ estado })
    .eq('id', id)
    .select('id, nombre, rol, estado, cargo, telefono, avatar_url, created_at, updated_at')
    .single();

  if (error) return { data: null, error: _err(error, 'actualizarEstado') };
  return { data: _withDerivedFields(data), error: null };
};

export const actualizarRol = async (id, rol) => {
  const { data, error } = await supabase
    .from('perfiles')
    .update({ rol })
    .eq('id', id)
    .select('id, nombre, rol, estado, cargo, telefono, avatar_url, created_at, updated_at')
    .single();

  if (error) return { data: null, error: _err(error, 'actualizarRol') };
  return { data: _withDerivedFields(data), error: null };
};

/* ── Avatar (Supabase Storage, bucket público `avatars`) ──────────────────
   Cada usuario sube únicamente a su propia carpeta {uid}/... (impuesto por
   RLS sobre storage.objects, ver 20260709000016). No se borra el avatar
   anterior en Storage al reemplazarlo: `perfiles` no guarda un storage_path
   separado del `avatar_url` (mismo comportamiento que tenía el flujo previo
   con Firebase), así que un reemplazo deja el archivo viejo huérfano en el
   bucket — aceptable para este alcance, revisar si el volumen crece. */
const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_MB = 5;
const TIPOS_AVATAR_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

export const subirAvatar = async (file) => {
  if (!TIPOS_AVATAR_PERMITIDOS.includes(file.type)) {
    return { data: null, error: 'Solo se permiten imágenes JPG, PNG o WebP' };
  }
  if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    return { data: null, error: `La imagen no debe superar ${MAX_AVATAR_MB}MB (tu archivo pesa ${mb}MB)` };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return { data: null, error: _err(authError, 'subirAvatar.auth') };
  const uid = authData?.user?.id;
  if (!uid) return { data: null, error: 'No hay sesión activa' };

  const path = `${uid}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) return { data: null, error: _err(uploadError, 'subirAvatar.upload') };

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  const { data: perfil, error: perfilError } = await actualizarPerfil({ avatar_url: url });
  if (perfilError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]).catch(() => {});
    return { data: null, error: perfilError };
  }

  return { data: { url, path, perfil }, error: null };
};

export const eliminarAvatar = async () => {
  const { data, error } = await actualizarPerfil({ avatar_url: '' });
  if (error) return { data: null, error };
  return { data, error: null };
};
