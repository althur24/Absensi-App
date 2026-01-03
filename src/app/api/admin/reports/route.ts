import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'daily';
        const date = searchParams.get('date');
        const month = searchParams.get('month'); // YYYY-MM
        const userId = searchParams.get('user_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        const supabase = createServerClient();

        // Get work hours config for late threshold
        const { data: workHoursConfig } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'work_hours')
            .single();

        const lateThreshold = workHoursConfig?.value?.late_threshold || '09:00';

        switch (type) {
            case 'daily': {
                // Daily report - all employees for a specific date
                const targetDate = date || new Date().toISOString().split('T')[0];

                const { data: users } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('status', 'active')
                    .eq('role', 'user');

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('user_id, type, created_at')
                    .gte('created_at', `${targetDate}T00:00:00`)
                    .lt('created_at', `${targetDate}T23:59:59`);

                const { data: leaves } = await supabase
                    .from('leaves')
                    .select('user_id, type, reason')
                    .eq('date', targetDate);

                const report = users?.map(user => {
                    const userAttendance = attendance?.filter(a => a.user_id === user.id) || [];
                    const checkin = userAttendance.find(a => a.type === 'checkin');
                    const checkout = userAttendance.find(a => a.type === 'checkout');
                    const leave = leaves?.find(l => l.user_id === user.id);

                    let status = 'Tidak Hadir';
                    let isLate = false;

                    if (leave) {
                        status = `${leave.type.charAt(0).toUpperCase() + leave.type.slice(1)}${leave.reason ? `: ${leave.reason}` : ''}`;
                    } else if (checkin && checkout) {
                        status = 'Lengkap';
                    } else if (checkin) {
                        status = 'Belum Pulang';
                    }

                    if (checkin) {
                        const checkinTime = new Date(checkin.created_at);
                        const [lateHour, lateMinute] = lateThreshold.split(':').map(Number);
                        const thresholdTime = new Date(checkinTime);
                        thresholdTime.setHours(lateHour, lateMinute, 0, 0);
                        isLate = checkinTime > thresholdTime;
                    }

                    return {
                        name: user.name,
                        email: user.email,
                        status,
                        checkin_time: checkin ? new Date(checkin.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
                        checkout_time: checkout ? new Date(checkout.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
                        is_late: isLate ? 'Ya' : 'Tidak',
                    };
                }) || [];

                return NextResponse.json({
                    report,
                    meta: { type: 'daily', date: targetDate, total: report.length }
                });
            }

            case 'monthly': {
                // Monthly recap - summary per employee for a month
                const targetMonth = month || new Date().toISOString().slice(0, 7);
                const [year, mon] = targetMonth.split('-').map(Number);
                const startOfMonth = `${targetMonth}-01`;
                const endOfMonth = new Date(year, mon, 0).toISOString().split('T')[0];
                const daysInMonth = new Date(year, mon, 0).getDate();

                const { data: users } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('status', 'active')
                    .eq('role', 'user');

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('user_id, type, created_at')
                    .gte('created_at', `${startOfMonth}T00:00:00`)
                    .lte('created_at', `${endOfMonth}T23:59:59`);

                const { data: leaves } = await supabase
                    .from('leaves')
                    .select('user_id, type, date')
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth);

                const report = users?.map(user => {
                    const userAttendance = attendance?.filter(a => a.user_id === user.id) || [];
                    const userLeaves = leaves?.filter(l => l.user_id === user.id) || [];

                    // Count unique days with check-in
                    const attendedDays = new Set(
                        userAttendance
                            .filter(a => a.type === 'checkin')
                            .map(a => a.created_at.split('T')[0])
                    );

                    // Count late days
                    let lateDays = 0;
                    attendedDays.forEach(day => {
                        const checkin = userAttendance.find(a => a.type === 'checkin' && a.created_at.startsWith(day));
                        if (checkin) {
                            const checkinTime = new Date(checkin.created_at);
                            const [lateHour, lateMinute] = lateThreshold.split(':').map(Number);
                            const thresholdTime = new Date(checkinTime);
                            thresholdTime.setHours(lateHour, lateMinute, 0, 0);
                            if (checkinTime > thresholdTime) lateDays++;
                        }
                    });

                    const izinCount = userLeaves.filter(l => l.type === 'izin').length;
                    const sakitCount = userLeaves.filter(l => l.type === 'sakit').length;
                    const cutiCount = userLeaves.filter(l => l.type === 'cuti').length;
                    const dinasCount = userLeaves.filter(l => l.type === 'dinas').length;

                    return {
                        name: user.name,
                        email: user.email,
                        total_hari_kerja: daysInMonth,
                        hadir: attendedDays.size,
                        terlambat: lateDays,
                        izin: izinCount,
                        sakit: sakitCount,
                        cuti: cutiCount,
                        dinas: dinasCount,
                        tidak_hadir: daysInMonth - attendedDays.size - izinCount - sakitCount - cutiCount - dinasCount,
                    };
                }) || [];

                return NextResponse.json({
                    report,
                    meta: { type: 'monthly', month: targetMonth, total: report.length }
                });
            }

            case 'employee': {
                // Single employee history
                if (!userId || !startDate || !endDate) {
                    return NextResponse.json({ error: 'user_id, start_date, dan end_date wajib diisi' }, { status: 400 });
                }

                const { data: user } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('id', userId)
                    .single();

                if (!user) {
                    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
                }

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('type, created_at, latitude, longitude')
                    .eq('user_id', userId)
                    .gte('created_at', `${startDate}T00:00:00`)
                    .lte('created_at', `${endDate}T23:59:59`)
                    .order('created_at', { ascending: true });

                const { data: leaves } = await supabase
                    .from('leaves')
                    .select('date, type, reason')
                    .eq('user_id', userId)
                    .gte('date', startDate)
                    .lte('date', endDate);

                // Group by date
                const dateMap: Record<string, { checkin?: string; checkout?: string; leave?: string }> = {};

                attendance?.forEach(a => {
                    const date = a.created_at.split('T')[0];
                    if (!dateMap[date]) dateMap[date] = {};
                    const time = new Date(a.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    if (a.type === 'checkin') dateMap[date].checkin = time;
                    else dateMap[date].checkout = time;
                });

                leaves?.forEach(l => {
                    if (!dateMap[l.date]) dateMap[l.date] = {};
                    dateMap[l.date].leave = `${l.type}${l.reason ? `: ${l.reason}` : ''}`;
                });

                const report = Object.entries(dateMap)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([date, data]) => ({
                        tanggal: date,
                        check_in: data.checkin || '-',
                        check_out: data.checkout || '-',
                        keterangan: data.leave || (data.checkin ? 'Hadir' : '-'),
                    }));

                return NextResponse.json({
                    report,
                    meta: { type: 'employee', user: user.name, email: user.email, startDate, endDate, total: report.length }
                });
            }

            case 'late': {
                // Late employees report
                const targetMonth = month || new Date().toISOString().slice(0, 7);
                const [year, mon] = targetMonth.split('-').map(Number);
                const startOfMonth = `${targetMonth}-01`;
                const endOfMonth = new Date(year, mon, 0).toISOString().split('T')[0];

                const { data: users } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('status', 'active')
                    .eq('role', 'user');

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('user_id, created_at')
                    .eq('type', 'checkin')
                    .gte('created_at', `${startOfMonth}T00:00:00`)
                    .lte('created_at', `${endOfMonth}T23:59:59`);

                const report = users?.map(user => {
                    const userCheckins = attendance?.filter(a => a.user_id === user.id) || [];
                    let lateDays = 0;
                    const lateTimes: string[] = [];

                    userCheckins.forEach(checkin => {
                        const checkinTime = new Date(checkin.created_at);
                        const [lateHour, lateMinute] = lateThreshold.split(':').map(Number);
                        const thresholdTime = new Date(checkinTime);
                        thresholdTime.setHours(lateHour, lateMinute, 0, 0);
                        if (checkinTime > thresholdTime) {
                            lateDays++;
                            lateTimes.push(`${checkin.created_at.split('T')[0]} (${checkinTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})`);
                        }
                    });

                    return {
                        name: user.name,
                        email: user.email,
                        total_hadir: userCheckins.length,
                        total_terlambat: lateDays,
                        persentase_terlambat: userCheckins.length > 0 ? Math.round((lateDays / userCheckins.length) * 100) : 0,
                        detail_terlambat: lateTimes.join('; '),
                    };
                })
                    .filter(u => u.total_terlambat > 0)
                    .sort((a, b) => b.total_terlambat - a.total_terlambat) || [];

                return NextResponse.json({
                    report,
                    meta: { type: 'late', month: targetMonth, lateThreshold, total: report.length }
                });
            }

            case 'leaves': {
                // Leave/absence report
                const targetMonth = month || new Date().toISOString().slice(0, 7);
                const [year, mon] = targetMonth.split('-').map(Number);
                const startOfMonth = `${targetMonth}-01`;
                const endOfMonth = new Date(year, mon, 0).toISOString().split('T')[0];

                const { data: leaves } = await supabase
                    .from('leaves')
                    .select(`
            *,
            user:users!leaves_user_id_fkey(name, email)
          `)
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth)
                    .order('date', { ascending: true });

                const report = leaves?.map(l => ({
                    tanggal: l.date,
                    nama: l.user?.name,
                    email: l.user?.email,
                    jenis: l.type.charAt(0).toUpperCase() + l.type.slice(1),
                    keterangan: l.reason || '-',
                })) || [];

                return NextResponse.json({
                    report,
                    meta: { type: 'leaves', month: targetMonth, total: report.length }
                });
            }

            default:
                return NextResponse.json({ error: 'Tipe laporan tidak valid' }, { status: 400 });
        }
    } catch (error) {
        console.error('Report error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
