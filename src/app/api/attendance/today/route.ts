import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { getTodayDate } from '@/lib/utils';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const supabase = createServerClient();
        const today = getTodayDate();

        // Get today's check-in
        const { data: checkin } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', session.id)
            .eq('type', 'checkin')
            .gte('created_at', `${today}T00:00:00`)
            .lt('created_at', `${today}T23:59:59`)
            .single();

        // Get today's check-out
        const { data: checkout } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', session.id)
            .eq('type', 'checkout')
            .gte('created_at', `${today}T00:00:00`)
            .lt('created_at', `${today}T23:59:59`)
            .single();

        return NextResponse.json({
            checkin,
            checkout,
            hasCheckedIn: !!checkin,
            hasCheckedOut: !!checkout,
        });
    } catch (error) {
        console.error('Today status error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
