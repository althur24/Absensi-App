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

    const isUrlValid = supabaseUrl.startsWith('http');
    const isAnonKeyValid = supabaseAnonKey.length > 0;
    const isServiceKeyValid = supabaseServiceKey && supabaseServiceKey.length > 0;

    if (!isUrlValid || !isAnonKeyValid || !isServiceKeyValid) {
        const missing: string[] = [];
        if (!isUrlValid) missing.push(`NEXT_PUBLIC_SUPABASE_URL (Value: ${supabaseUrl ? 'Invalid URL' : 'Empty'})`);
        if (!isAnonKeyValid) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        if (!isServiceKeyValid) missing.push('SUPABASE_SERVICE_ROLE_KEY');

        throw new Error(
            `Supabase Config Error. Missing/Invalid: ${missing.join(', ')}`
        );
    }

    // Debug URL (safe part)
    console.log('Supabase Server Client Init to:', supabaseUrl.substring(0, 20) + '...');

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
