import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when both env vars are present. Bootstrap uses this to fail gracefully. */
export const hasSupabaseEnv = Boolean(url && anonKey)

if (!hasSupabaseEnv) {
  // Loud console error; the app still boots to the login screen but every
  // auth/data call fails until these are set in .env.local (dev) or the
  // Vercel project env (prod). VITE_* vars are inlined at build time.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local, fill in your project values, and restart the dev server.',
  )
}

// Fall back to a syntactically-valid placeholder so createClient() doesn't throw
// at import time when env is missing — runtime calls will simply error and be
// caught by bootstrap(), which then shows the login screen.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'mess-manager-auth',
    },
  },
)
