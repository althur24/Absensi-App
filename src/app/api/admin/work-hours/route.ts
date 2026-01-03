import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

// GET - Get work hours config
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'work_hours')
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const defaultWorkHours = {
            start_time: '08:00',
            end_time: '17:00',
            late_threshold: '09:00',
        };

        return NextResponse.json({
            config: data?.value || defaultWorkHours,
        });
    } catch (error) {
        console.error('Get work hours error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}

// POST - Update work hours config
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { start_time, end_time, late_threshold } = await request.json();

        if (!start_time || !end_time || !late_threshold) {
            return NextResponse.json(
                { error: 'Semua field wajib diisi' },
                { status: 400 }
            );
        }

        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(start_time) || !timeRegex.test(end_time) || !timeRegex.test(late_threshold)) {
            return NextResponse.json(
                { error: 'Format waktu tidak valid (HH:MM)' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        const { error } = await supabase
            .from('config')
            .upsert({
                key: 'work_hours',
                value: { start_time, end_time, late_threshold },
                updated_at: new Date().toISOString(),
            });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Jam kerja berhasil disimpan',
        });
    } catch (error) {
        console.error('Update work hours error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
