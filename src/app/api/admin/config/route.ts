import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/adminLog';

// Get office config & work hours
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

        const { data, error } = await supabase
            .from('config')
            .select('*')
            .in('key', ['office_location', 'work_hours']);

        // Defaults
        let locationConfig = {
            latitude: -6.2088,
            longitude: 106.8456,
            radius_meters: 300,
            name: 'Kantor Pusat',
        };

        let workHoursConfig = {
            start_time: '08:00',
            end_time: '17:00',
            late_threshold: '09:00',
            checkin_start: '06:00',
            checkin_end: '23:59',
        };

        if (data) {
            data.forEach(item => {
                if (item.key === 'office_location') locationConfig = { ...locationConfig, ...item.value };
                if (item.key === 'work_hours') workHoursConfig = { ...workHoursConfig, ...item.value };
            });
        }

        return NextResponse.json({
            location: locationConfig,
            workHours: workHoursConfig,
            // Keep legacy support for button component (it expects data.config)
            config: locationConfig
        });
    } catch (error) {
        console.error('Get config error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

// Update config
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const type = body.type; // 'location' or 'work_hours'
        const supabase = createServerClient();

        if (type === 'location') {
            const { latitude, longitude, radius_meters, name } = body;

            if (!latitude || !longitude || !radius_meters) {
                return NextResponse.json({ error: 'Data lokasi tidak lengkap' }, { status: 400 });
            }

            const value = {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                radius_meters: parseInt(radius_meters),
                name: name || 'Kantor',
            };

            const { error } = await supabase.from('config').upsert({
                key: 'office_location',
                value,
                updated_at: new Date().toISOString(),
            });

            if (error) throw error;

            await logAdminAction(session.id, session.name, 'config_update_location', {
                name: value.name,
                radius: value.radius_meters,
            });

            return NextResponse.json({ success: true, message: 'Lokasi berhasil disimpan' });
        }

        else if (type === 'work_hours') {
            const { start_time, end_time, late_threshold, checkin_start, checkin_end } = body;

            const value = {
                start_time,
                end_time,
                late_threshold,
                checkin_start: checkin_start || '06:00',
                checkin_end: checkin_end || '23:59',
            };

            const { error } = await supabase.from('config').upsert({
                key: 'work_hours',
                value,
                updated_at: new Date().toISOString(),
            });

            if (error) throw error;

            await logAdminAction(session.id, session.name, 'config_update_hours', {
                checkin_start: value.checkin_start,
                checkin_end: value.checkin_end,
                late_threshold: value.late_threshold,
            });

            return NextResponse.json({ success: true, message: 'Jam kerja berhasil disimpan' });
        }

        return NextResponse.json({ error: 'Invalid config type' }, { status: 400 });

    } catch (error) {
        console.error('Update config error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
