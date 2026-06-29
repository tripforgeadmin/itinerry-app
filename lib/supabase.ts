import { createClient } from "@supabase/supabase-js";

// Accept either a full SUPABASE_URL or just the project ref via SUPABASE_DB_ID.
const supabaseUrl =
  process.env.SUPABASE_URL ??
  (process.env.SUPABASE_DB_ID ? `https://${process.env.SUPABASE_DB_ID}.supabase.co` : "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
