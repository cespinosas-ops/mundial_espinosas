import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Cliente de servidor con permisos completos (service role / secret key).
// Se crea de forma perezosa para que el build no falle si las env vars
// no están presentes localmente (solo viven en Vercel).
let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase admin')
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

// Verifica el secreto de admin enviado en el header de la petición.
export function checkAdminSecret(req: Request): boolean {
  const provided = req.headers.get('x-admin-secret')
  const expected = process.env.ADMIN_SECRET
  return !!expected && provided === expected
}
