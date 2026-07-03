import { createClient } from "@supabase/supabase-js";

// Ensure environment variables are loaded
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase environment variables are missing.");
}

// For client-side / public operations
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// For server-side administrative operations (bypasses RLS)
// Ensure this is NEVER used on the client!
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl || "", supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase;
