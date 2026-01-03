import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

// Get office config
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
            .eq('key', 'office_location')
            .single();

        if (error) {
            // Return default if not found
            return NextResponse.json({
                config: {
                    latitude: -6.2088,
                    longitude: 106.8456,
                    radius_meters: 300,
                    name: 'Kantor Pusat',
                },
            });
        }

        return NextResponse.json({ config: data.value });
    } catch (error) {
        console.error('Get config error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

// Update office config
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { latitude, longitude, radius_meters, name } = await request.json();

        if (!latitude || !longitude || !radius_meters) {
            return NextResponse.json(
                { error: 'Latitude, longitude, dan radius wajib diisi' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        const configValue = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            radius_meters: parseInt(radius_meters),
            name: name || 'Kantor',
        };

        const { error } = await supabase
            .from('config')
            .upsert({
                key: 'office_location',
                value: configValue,
                updated_at: new Date().toISOString(),
            });

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Lokasi kantor berhasil diupdate',
            config: configValue,
        });
    } catch (error) {
        console.error('Update config error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
