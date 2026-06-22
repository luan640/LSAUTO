import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente server-only com a service role key: ignora RLS.
// Nunca importar este módulo em Client Components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
