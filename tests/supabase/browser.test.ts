import { describe, expect, test } from "vitest";

const hasSupabaseConfig =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const describeIfSupabase = hasSupabaseConfig ? describe : describe.skip;

describeIfSupabase("browser supabase client", () => {
  test("returns a singleton client without throwing", async () => {
    const { getBrowserSupabase } = await import("@/lib/supabase/browser");
    const a = getBrowserSupabase();
    const b = getBrowserSupabase();

    expect(a).toBe(b);
  });
});
