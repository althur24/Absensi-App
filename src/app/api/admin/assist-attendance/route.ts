import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/adminLog';

// Admin-assisted check-in/check-out for employees
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user_id, action, reason } = await request.json();

        if (!user_id || !action) {
            return NextResponse.json({ error: 'user_id dan action diperlukan' }, { status: 400 });
        }

        if (!['checkin', 'checkout'].includes(action)) {
            return NextResponse.json({ error: 'Action harus checkin atau checkout' }, { status: 400 });
        }

        const supabase = createServerClient();

        // Get user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', user_id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
        }

        // Get today's date in WIB
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

        if (action === 'checkin') {
            // Check if already checked in today
            const { data: existing } = await supabase
                .from('attendance')
                .select('id')
                .eq('user_id', user_id)
                .eq('type', 'checkin')
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ error: 'User sudah check-in hari ini' }, { status: 400 });
            }

            // Create check-in record (same structure as normal checkin)
            const { data: attendance, error: insertError } = await supabase
                .from('attendance')
                .insert({
                    user_id,
                    type: 'checkin',
                    photo_url: null, // No photo for admin-assisted
                    latitude: null,
                    longitude: null,
                    address: `Dibantu oleh Admin${reason ? `: ${reason}` : ''}`,
                    device_info: { assisted_by: session.name || 'Admin', reason: reason || 'HP tidak bisa digunakan' }
                })
                .select()
                .single();

            if (insertError) {
                console.error('Insert error:', insertError);
                return NextResponse.json({ error: 'Gagal membuat absensi' }, { status: 500 });
            }

            // Log admin action
            await logAdminAction(
                session.id,
                session.name || 'Admin',
                'attendance_assist',
                {
                    action: 'check-in',
                    user_id,
                    user_name: user.name,
                    reason: reason || 'HP tidak bisa digunakan'
                }
            );

            return NextResponse.json({
                success: true,
                message: `Check-in berhasil untuk ${user.name}`,
                attendance
            });

        } else {
            // Check-out - check if user has checked in today but not checked out
            const { data: checkinRecord } = await supabase
                .from('attendance')
                .select('id, created_at')
                .eq('user_id', user_id)
                .eq('type', 'checkin')
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`)
                .maybeSingle();

            if (!checkinRecord) {
                return NextResponse.json({ error: 'User belum check-in hari ini' }, { status: 400 });
            }

            // Check if already checked out
            const { data: checkoutRecord } = await supabase
                .from('attendance')
                .select('id')
                .eq('user_id', user_id)
                .eq('type', 'checkout')
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`)
                .maybeSingle();

            if (checkoutRecord) {
                return NextResponse.json({ error: 'User sudah check-out hari ini' }, { status: 400 });
            }

            // Create checkout record
            const { data: attendance, error: insertError } = await supabase
                .from('attendance')
                .insert({
                    user_id,
                    type: 'checkout',
                    photo_url: null,
                    latitude: null,
                    longitude: null,
                    address: `Dibantu oleh Admin${reason ? `: ${reason}` : ''}`,
                    device_info: { assisted_by: session.name || 'Admin', reason: reason || 'HP tidak bisa digunakan' }
                })
                .select()
                .single();

            if (insertError) {
                console.error('Insert error:', insertError);
                return NextResponse.json({ error: 'Gagal membuat absensi' }, { status: 500 });
            }

            // Log admin action
            await logAdminAction(
                session.id,
                session.name || 'Admin',
                'attendance_assist',
                {
                    action: 'check-out',
                    user_id,
                    user_name: user.name,
                    reason: reason || 'HP tidak bisa digunakan'
                }
            );

            return NextResponse.json({
                success: true,
                message: `Check-out berhasil untuk ${user.name}`,
                attendance
            });
        }

    } catch (error) {
        console.error('Admin assist error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
