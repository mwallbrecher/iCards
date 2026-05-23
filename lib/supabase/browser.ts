"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

const supabaseUrl = requireEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);
const supabaseAnonKey = requireEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

type BrowserSupabaseClient = ReturnType<typeof createClient<Database>>;

let cachedClient: BrowserSupabaseClient | null = null;

/**
 * Returns a singleton browser-side Supabase client using the public anon key.
 *
 * This client is only for Realtime change pings. All game reads and writes
 * still go through server actions, and Realtime payloads are ignored.
 */
export function getBrowserSupabase(): BrowserSupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 5,
        },
      },
    });
  }

  return cachedClient;
}
