import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '30', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const supabase = createServerClient();

        let query = supabase
            .from('attendance')
            .select('*', { count: 'exact' })
            .eq('user_id', session.id)
            .order('created_at', { ascending: false });

        // Date filter - use WIB timezone
        if (startDate) {
            // Start of day in WIB (UTC+7)
            const startWIB = new Date(`${startDate}T00:00:00+07:00`);
            query = query.gte('created_at', startWIB.toISOString());
        }

        if (endDate) {
            // End of day in WIB (UTC+7)
            const endWIB = new Date(`${endDate}T23:59:59+07:00`);
            query = query.lte('created_at', endWIB.toISOString());
        }

        const { data: attendance, error, count } = await query
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[History Error]', error);
            throw error;
        }

        return NextResponse.json({
            attendance,
            total: count,
            limit,
            offset,
        });
    } catch (error) {
        console.error('History error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
