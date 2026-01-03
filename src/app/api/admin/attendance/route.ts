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

        // Filter by date (Assume WIB / UTC+7 for simplicity)
        if (date) {
            // Convert selected date (YYYY-MM-DD) to UTC range that covers WIB day
            // 00:00 WIB = Prev Day 17:00 UTC
            // 23:59 WIB = Today 16:59 UTC
            // But easier: send timestamp with offset lets DB handle it
            query = query
                .gte('created_at', `${date}T00:00:00+07:00`)
                .lt('created_at', `${date}T23:59:59+07:00`);
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
