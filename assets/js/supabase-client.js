// Supabase client factory. Credentials come from .env (VITE_* is safe for the
// browser). The anon key is a public token; the service_role key never appears
// in client code.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(url, anonKey);

export function isSupabaseConfigured() {
    return Boolean(url && anonKey);
}