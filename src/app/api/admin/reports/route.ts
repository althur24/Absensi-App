import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

// Helper function to get WIB date range
function getWIBDateRange(dateStr: string): { start: string; end: string } {
    const wibStart = new Date(`${dateStr}T00:00:00+07:00`);
    const wibEnd = new Date(`${dateStr}T23:59:59+07:00`);
    return {
        start: wibStart.toISOString(),
        end: wibEnd.toISOString()
    };
}

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
        const divisionId = searchParams.get('division_id'); // NEW: filter by division

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
                const range = getWIBDateRange(targetDate);

                let usersQuery = supabase
                    .from('users')
                    .select('id, name, email, division_id, divisions(name)')
                    .eq('status', 'active')
                    .eq('role', 'user');

                // Apply division filter if provided
                if (divisionId) {
                    usersQuery = usersQuery.eq('division_id', divisionId);
                }

                const { data: users } = await usersQuery;

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('user_id, type, created_at')
                    .gte('created_at', range.start)
                    .lte('created_at', range.end);

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
                        const checkinWIB = new Date(checkinTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                        const [lateHour, lateMinute] = lateThreshold.split(':').map(Number);
                        const thresholdTime = new Date(checkinWIB);
                        thresholdTime.setHours(lateHour, lateMinute, 0, 0);
                        isLate = checkinWIB > thresholdTime;
                    }

                    return {
                        name: user.name,
                        email: user.email,
                        divisi: (user as typeof user & { divisions?: { name: string } }).divisions?.name || '-',
                        status,
                        checkin_time: checkin ? new Date(checkin.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-',
                        checkout_time: checkout ? new Date(checkout.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-',
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

                const startRange = getWIBDateRange(startOfMonth);
                const endRange = getWIBDateRange(endOfMonth);

                let monthlyUsersQuery = supabase
                    .from('users')
                    .select('id, name, email, division_id, divisions(name)')
                    .eq('status', 'active')
                    .eq('role', 'user');

                if (divisionId) {
                    monthlyUsersQuery = monthlyUsersQuery.eq('division_id', divisionId);
                }

                const { data: users } = await monthlyUsersQuery;

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('user_id, type, created_at')
                    .gte('created_at', startRange.start)
                    .lte('created_at', endRange.end);

                const { data: leaves } = await supabase
                    .from('leaves')
                    .select('user_id, type, date')
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth);

                const report = users?.map(user => {
                    const userAttendance = attendance?.filter(a => a.user_id === user.id) || [];
                    const userLeaves = leaves?.filter(l => l.user_id === user.id) || [];

                    // Count unique WIB days with check-in
                    const attendedDays = new Set(
                        userAttendance
                            .filter(a => a.type === 'checkin')
                            .map(a => {
                                const wibDate = new Date(a.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
                                return wibDate;
                            })
                    );

                    // Count late days
                    let lateDays = 0;
                    attendedDays.forEach(day => {
                        const checkin = userAttendance.find(a => {
                            const wibDate = new Date(a.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
                            return a.type === 'checkin' && wibDate === day;
                        });
                        if (checkin) {
                            const checkinTime = new Date(checkin.created_at);
                            const checkinWIB = new Date(checkinTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                            const [lateHour, lateMinute] = lateThreshold.split(':').map(Number);
                            const thresholdTime = new Date(checkinWIB);
                            thresholdTime.setHours(lateHour, lateMinute, 0, 0);
                            if (checkinWIB > thresholdTime) lateDays++;
                        }
                    });

                    const izinCount = userLeaves.filter(l => l.type === 'izin').length;
                    const sakitCount = userLeaves.filter(l => l.type === 'sakit').length;
                    const cutiCount = userLeaves.filter(l => l.type === 'cuti').length;
                    const dinasCount = userLeaves.filter(l => l.type === 'dinas').length;

                    return {
                        name: user.name,
                        email: user.email,
                        divisi: (user as typeof user & { divisions?: { name: string } }).divisions?.name || '-',
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

                const startRange = getWIBDateRange(startDate);
                const endRange = getWIBDateRange(endDate);

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('type, created_at, latitude, longitude')
                    .eq('user_id', userId)
                    .gte('created_at', startRange.start)
                    .lte('created_at', endRange.end)
                    .order('created_at', { ascending: true });

                const { data: leaves } = await supabase
                    .from('leaves')
                    .select('date, type, reason')
                    .eq('user_id', userId)
                    .gte('date', startDate)
                    .lte('date', endDate);

                // Group by WIB date
                const dateMap: Record<string, { checkin?: string; checkout?: string; leave?: string }> = {};

                attendance?.forEach(a => {
                    const wibDate = new Date(a.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
                    if (!dateMap[wibDate]) dateMap[wibDate] = {};
                    const time = new Date(a.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                    if (a.type === 'checkin') dateMap[wibDate].checkin = time;
                    else dateMap[wibDate].checkout = time;
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

                const startRange = getWIBDateRange(startOfMonth);
                const endRange = getWIBDateRange(endOfMonth);

                let lateUsersQuery = supabase
                    .from('users')
                    .select('id, name, email, division_id, divisions(name)')
                    .eq('status', 'active')
                    .eq('role', 'user');

                if (divisionId) {
                    lateUsersQuery = lateUsersQuery.eq('division_id', divisionId);
                }

                const { data: users } = await lateUsersQuery;

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('user_id, created_at')
                    .eq('type', 'checkin')
                    .gte('created_at', startRange.start)
                    .lte('created_at', endRange.end);

                const report = users?.map(user => {
                    const userCheckins = attendance?.filter(a => a.user_id === user.id) || [];
                    let lateDays = 0;
                    const lateTimes: string[] = [];

                    userCheckins.forEach(checkin => {
                        const checkinTime = new Date(checkin.created_at);
                        const checkinWIB = new Date(checkinTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                        const [lateHour, lateMinute] = lateThreshold.split(':').map(Number);
                        const thresholdTime = new Date(checkinWIB);
                        thresholdTime.setHours(lateHour, lateMinute, 0, 0);
                        if (checkinWIB > thresholdTime) {
                            lateDays++;
                            const wibDate = new Date(checkin.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
                            const wibTime = checkinWIB.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                            lateTimes.push(`${wibDate} (${wibTime})`);
                        }
                    });

                    return {
                        name: user.name,
                        email: user.email,
                        divisi: (user as typeof user & { divisions?: { name: string } }).divisions?.name || '-',
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

                let leavesQuery = supabase
                    .from('leaves')
                    .select(`
                        *,
                        user:users!leaves_user_id_fkey(name, email, division_id, divisions(name))
                    `)
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth)
                    .order('date', { ascending: true });

                const { data: leaves } = await leavesQuery;

                // Filter by division if needed
                const filteredLeaves = divisionId
                    ? leaves?.filter(l => l.user?.division_id === divisionId)
                    : leaves;

                const report = filteredLeaves?.map(l => ({
                    tanggal: l.date,
                    nama: l.user?.name,
                    email: l.user?.email,
                    divisi: (l.user as { divisions?: { name: string } })?.divisions?.name || '-',
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
