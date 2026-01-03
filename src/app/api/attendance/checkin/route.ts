import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { calculateDistance, getTodayDate, OFFICE_LOCATION } from '@/lib/utils';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { photo_url, latitude, longitude, address, device_info } = await request.json();

        // Validate required fields
        if (!photo_url || latitude === undefined || longitude === undefined) {
            return NextResponse.json(
                { error: 'Photo, latitude, dan longitude wajib diisi' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Get configs from database
        let officeConfig = OFFICE_LOCATION;
        let workHours = { checkin_start: '05:00', checkin_end: '23:59' }; // Default permissive

        const { data: configData } = await supabase
            .from('config')
            .select('*')
            .in('key', ['office_location', 'work_hours']);

        if (configData) {
            configData.forEach(item => {
                if (item.key === 'office_location') officeConfig = item.value;
                if (item.key === 'work_hours') workHours = { ...workHours, ...item.value };
            });
        }

        // 1. Validate Time Window (WIB)
        const nowWIB = new Date().toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit'
        }); // "HH:MM"

        if (nowWIB < workHours.checkin_start || nowWIB > workHours.checkin_end) {
            return NextResponse.json(
                { error: `Absen Masuk hanya dibuka pukul ${workHours.checkin_start} - ${workHours.checkin_end} WIB` },
                { status: 400 }
            );
        }

        // 2. Validate location (within office radius)
        const distance = calculateDistance(
            latitude,
            longitude,
            officeConfig.latitude,
            officeConfig.longitude
        );

        if (distance > officeConfig.radius_meters) {
            return NextResponse.json(
                { error: `Lokasi Anda ${Math.round(distance)}m dari kantor. Maksimal ${officeConfig.radius_meters}m. Check-in gagal.` },
                { status: 400 }
            );
        }

        const today = getTodayDate(); // Returns WIB YYYY-MM-DD

        // 3. Check if already checked in today (WIB Timezone Aware)
        // Calculate UTC Range for WIB Day: 00:00+07 to 23:59+07
        const wibStart = new Date(`${today}T00:00:00+07:00`);
        const wibEnd = new Date(`${today}T23:59:59+07:00`);

        const { data: existingCheckin } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', session.id)
            .eq('type', 'checkin')
            .gte('created_at', wibStart.toISOString())
            .lte('created_at', wibEnd.toISOString())
            .single();

        if (existingCheckin) {
            return NextResponse.json(
                { error: 'Anda sudah melakukan check-in hari ini' },
                { status: 400 }
            );
        }

        // Create attendance record
        const { data: attendance, error } = await supabase
            .from('attendance')
            .insert({
                user_id: session.id,
                type: 'checkin',
                photo_url,
                latitude,
                longitude,
                address,
                device_info,
            })
            .select()
            .single();

        if (error) {
            console.error('[CheckIn Error] Insert failed:', error);
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Check-in berhasil',
            attendance,
        });
    } catch (error) {
        console.error('Check-in error full:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
