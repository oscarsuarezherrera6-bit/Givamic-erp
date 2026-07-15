import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Cliente Supabase. Es null si las variables de entorno no están definidas,
 * en cuyo caso el sistema usa localStorage como fallback automático.
 */
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseEnabled = !!supabase
