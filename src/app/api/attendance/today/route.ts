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
        const today = getTodayDate(); // WIB YYYY-MM-DD

        // Calculate UTC Range for WIB Day
        // 00:00 WIB = Prev Day 17:00 UTC
        const wibStart = new Date(`${today}T00:00:00+07:00`);
        const wibEnd = new Date(`${today}T23:59:59+07:00`);

        // Get today's check-in
        const { data: checkin } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', session.id)
            .eq('type', 'checkin')
            .gte('created_at', wibStart.toISOString())
            .lte('created_at', wibEnd.toISOString())
            .single();

        // Get today's check-out
        const { data: checkout } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', session.id)
            .eq('type', 'checkout')
            .gte('created_at', wibStart.toISOString())
            .lte('created_at', wibEnd.toISOString())
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
