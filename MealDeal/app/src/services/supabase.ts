/**
 * Supabase Client Configuration
 * ================================
 * Connects the app to the Supabase database.
 *
 * SECURITY NOTE: Only the anon (public) key is used here.
 * The service_role key must NEVER appear in client-side code.
 */

import { createClient } from '@supabase/supabase-js';

// Configuration — loaded from environment or fallback
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://wnmozcorrizjvrpduzgw.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndubW96Y29ycml6anZycGR1emd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDQ0NjEsImV4cCI6MjA5MTA4MDQ2MX0.D_2V-W4BT9glrcCYaqRMFO5cOGMoe4Jp11e5kv28HrE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    // persistSession deaktiviert — AsyncStorage ist nicht installiert
    persistSession: false,
  },
});

/**
 * Check if Supabase is properly configured.
 */
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.includes('.supabase.co') &&
    SUPABASE_ANON_KEY.startsWith('eyJ')
  );
}
