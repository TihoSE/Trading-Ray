import { createClient } from '@supabase/supabase-js'

function readEnv(name) {
  const raw = import.meta.env[name]
  const value = typeof raw === 'string' ? raw.trim() : ''

  if (!value) {
    console.error(
      `[supabase] ${name} is missing or empty. Set it in .env for local dev and in the Vercel project environment, then redeploy. Vite inlines VITE_ variables at build time, so a later change does not affect an existing deployment.`,
    )
  }

  return value
}

const supabaseUrl = readEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Check the console for which VITE_SUPABASE_ variable is missing or empty.',
  )
}

let projectHost = supabaseUrl
try {
  projectHost = new URL(supabaseUrl).host
} catch {
  console.error(
    `[supabase] VITE_SUPABASE_URL is not a valid URL: "${supabaseUrl}". Expected https://<project-ref>.supabase.co`,
  )
  throw new Error('Supabase URL is invalid. Check the console for details.')
}

console.info(`[supabase] Using project ${projectHost}`)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
