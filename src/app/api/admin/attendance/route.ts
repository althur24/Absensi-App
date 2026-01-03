import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const userId = searchParams.get('user_id');
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const supabase = createServerClient();

        let query = supabase
            .from('attendance')
            .select(`
        *,
        user:users(id, name, email)
      `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Filter by date
        if (date) {
            query = query
                .gte('created_at', `${date}T00:00:00`)
                .lt('created_at', `${date}T23:59:59`);
        }

        // Filter by user
        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data: attendance, error, count } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json({
            attendance,
            total: count,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Admin attendance error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
