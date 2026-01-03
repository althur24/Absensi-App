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

        // Get office config from database
        let officeConfig = OFFICE_LOCATION;
        const { data: configData } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'office_location')
            .single();

        if (configData?.value) {
            officeConfig = configData.value;
        }

        // Validate location (within office radius)
        const distance = calculateDistance(
            latitude,
            longitude,
            officeConfig.latitude,
            officeConfig.longitude
        );

        if (distance > officeConfig.radius_meters) {
            return NextResponse.json(
                { error: `Lokasi Anda ${Math.round(distance)}m dari kantor. Maksimal ${officeConfig.radius_meters}m. Check-out gagal.` },
                { status: 400 }
            );
        }

        const today = getTodayDate(); // Returns WIB YYYY-MM-DD

        // Calculate UTC Range for WIB Day: 00:00+07 to 23:59+07
        const wibStart = new Date(`${today}T00:00:00+07:00`);
        const wibEnd = new Date(`${today}T23:59:59+07:00`);

        // Check if already checked in today (must check in before check out)
        const { data: existingCheckin } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', session.id)
            .eq('type', 'checkin')
            .gte('created_at', wibStart.toISOString())
            .lte('created_at', wibEnd.toISOString())
            .single();

        if (!existingCheckin) {
            return NextResponse.json(
                { error: 'Anda belum melakukan check-in hari ini' },
                { status: 400 }
            );
        }

        // Check if already checked out today
        const { data: existingCheckout } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', session.id)
            .eq('type', 'checkout')
            .gte('created_at', wibStart.toISOString())
            .lte('created_at', wibEnd.toISOString())
            .single();

        if (existingCheckout) {
            return NextResponse.json(
                { error: 'Anda sudah melakukan check-out hari ini' },
                { status: 400 }
            );
        }

        // Create attendance record
        const { data: attendance, error } = await supabase
            .from('attendance')
            .insert({
                user_id: session.id,
                type: 'checkout',
                photo_url,
                latitude,
                longitude,
                address,
                device_info,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Check-out berhasil',
            attendance,
        });
    } catch (error) {
        console.error('Check-out error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
