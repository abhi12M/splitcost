import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_SUPABASE_URL ??
  "https://example.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_SUPABASE_PUBLISHABLE_KEY ??
  "build-time-placeholder-key";

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseKey
);
