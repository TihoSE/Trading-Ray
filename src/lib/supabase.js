/**
 * Public Supabase client. The anon key only identifies the project; it is
 * shipped in the bundle on purpose. Authorization is Row Level Security plus
 * `auth.uid()` inside the SQL functions, not secrecy of this key.
 *
 * Vite inlines `import.meta.env.VITE_*` when it builds. Changing a variable in
 * Vercel does nothing until the next deploy, which is why a missing key fails
 * the whole app here instead of failing later on the first request.
 */
import { createClient } from '@supabase/supabase-js'

function readEnv(value, name) {
  const trimmed = typeof value === 'string' ? value.trim() : ''

  if (!trimmed) {
    console.error(
      `[supabase] ${name} is missing or empty. Set it in .env for local dev and in the Vercel project environment, then redeploy. Vite inlines VITE_ variables at build time, so a later change does not affect an existing deployment.`,
    )
  }

  return trimmed
}

const supabaseUrl = readEnv(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL')
const supabaseAnonKey = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY')

function invalidUrlMessage() {
  return 'VITE_SUPABASE_URL is not a valid URL. Expected https://<project-ref>.supabase.co'
}

let configError = null

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean)
  configError = `${missing.join(' and ')} is missing or empty. Add the variable in Vercel, then redeploy.`
} else {
  try {
    const projectHost = new URL(supabaseUrl).host
    console.info(`[supabase] Using project ${projectHost}`)
  } catch {
    console.error(`[supabase] ${invalidUrlMessage()} Received: "${supabaseUrl}"`)
    configError = invalidUrlMessage()
  }
}

export const supabaseConfigError = configError

export const supabase = configError ? null : createClient(supabaseUrl, supabaseAnonKey)
