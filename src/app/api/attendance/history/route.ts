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

        const supabase = createServerClient();

        const { data: attendance, error, count } = await supabase
            .from('attendance')
            .select('*', { count: 'exact' })
            .eq('user_id', session.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

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
        console.error('History error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
