import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

// Get admin activity logs
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        const supabase = createServerClient();

        const { data: logs, error } = await supabase
            .from('admin_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[Admin Logs Error]', error);
            // If table doesn't exist, return empty array
            if (error.code === '42P01') {
                return NextResponse.json({ logs: [] });
            }
            throw error;
        }

        return NextResponse.json({ logs: logs || [] });
    } catch (error) {
        console.error('Get admin logs error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}

// Create admin log entry (internal use)
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, details } = await request.json();

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        const supabase = createServerClient();

        const { error } = await supabase.from('admin_logs').insert({
            admin_id: session.id,
            admin_name: session.name,
            action,
            details: details || {},
        });

        if (error) {
            console.error('[Admin Log Insert Error]', error);
            // Silently fail if table doesn't exist
            if (error.code === '42P01') {
                return NextResponse.json({ success: true });
            }
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Create admin log error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
    }
}
