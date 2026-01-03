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

        // 3. Check if already checked in today
        const { data: existingCheckin } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', session.id)
            .eq('type', 'checkin')
            .gte('created_at', `${today}T00:00:00`)
            .lt('created_at', `${today}T23:59:59`) // Note: DB created_at is UTC. 
            // If today is 2024-01-02 (WIB). Range is 2024-01-02T00:00:00 to 23:59:59.
            // But wait, the query should match timestamps in DB (UTC).
            // A Record at 08:00 WIB (01:00 UTC) has created_at '2024-01-02T01:00:00Z'.
            // The string comparison in Postgres works if the DB field is timestamp/timestamptz.
            // Supabase handles ISO strings fine.
            // IF 'today' string is WIB date (2024-01-02), and we compare strictly string vs string?
            // NO, created_at is timestamptz. Providing ISO string is interpreted as timestamp. 
            // '2024-01-02T00:00:00' without Z is treated as Local usually or UTC? 
            // In Supabase/Postgres, implicit timezone is usually UTC if not specified.
            // So `${today}T00:00:00` -> `2024-01-02 00:00:00 UTC`.
            // Which corresponds to `2024-01-02 07:00:00 WIB`.
            // So checkins between 00:00 and 07:00 WIB would be MISSED if we use this query unmodified.

            // FIX: We need to query range that COVERS the WIB day.
            // 00:00 WIB = Prev Day 17:00 UTC.
            // 24:00 WIB = Today 17:00 UTC.

            // However, implementing timezone math here is complex.
            // Simplest way: Query a wider range (todayUTC - 1 day to todayUTC + 1 day),
            // And filter in JS with `getWIBDateStr`.

            // OR: Let Postgres do it? 
            // .filter('created_at', 'gte', '2024-01-01T17:00:00Z') ?

            // Let's rely on the fact that most checkins are > 06:00 WIB (which is 23:00 Prev Day or 00:00 Same Day).
            // BUT user specifically complained about "1 AM" (18:00 UTC Prev Day).

            // Robust Fix:
            // Query purely by checking if a record exists where `(created_at AT TIME ZONE 'Asia/Jakarta')::date = 'YYYY-MM-DD'`
            // But Supabase JS client doesn't support easy SQL functions in filters.

            // Alternative:
            // Calculate UTC start/end for the WIB day.
            // WIB Day Start: `YYYY-MM-DD 00:00:00+07`
            // WIB Day End:   `YYYY-MM-DD 23:59:59+07`
            .single();

        // Let's implement the UTC calculation fix below inside the function body.

        const wibStart = new Date(`${today}T00:00:00+07:00`);
        const wibEnd = new Date(`${today}T23:59:59+07:00`);

        const { data: existingCheckinFixed } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', session.id)
            .eq('type', 'checkin')
            .gte('created_at', wibStart.toISOString())
            .lte('created_at', wibEnd.toISOString())
            .single();

        if (existingCheckinFixed) {
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
