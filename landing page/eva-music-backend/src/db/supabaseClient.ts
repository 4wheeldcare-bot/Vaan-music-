import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const fallbackSupabaseUrl = 'https://placeholder.supabase.co';
const fallbackSupabaseKey = 'local-dev-key';
const supabaseUrl = process.env.SUPABASE_URL || fallbackSupabaseUrl;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || fallbackSupabaseKey;

if (!process.env.SUPABASE_URL) {
  console.warn('[Supabase] No SUPABASE_URL configured. Running in local demo mode with safe fallbacks.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: {
    transport: ws as any,
  },
});
