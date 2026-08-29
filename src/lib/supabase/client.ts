import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/src/lib/supabase/env";

/**
 * Supabase client for Client Components (browser).
 * Uses a singleton internally — safe to call on every render.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createBrowserClient(url, anonKey);
}
