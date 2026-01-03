import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isConfigured = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 0;

// Client-side Supabase client (for browser)
export const supabase: SupabaseClient = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as unknown as SupabaseClient);

// Server-side Supabase client with service role (for API routes)
export function createServerClient(): SupabaseClient {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!isConfigured || !supabaseServiceKey) {
        throw new Error(
            'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local'
        );
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
