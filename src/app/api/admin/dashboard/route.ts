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
        const today = searchParams.get('date') || new Date().toISOString().split('T')[0];

        const supabase = createServerClient();

        // Get office config for late threshold
        const { data: configData } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'work_hours')
            .single();

        const lateThreshold = configData?.value?.late_threshold || '09:00';

        // Get all active users
        const { data: users } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('status', 'active')
            .eq('role', 'user');

        const totalUsers = users?.length || 0;

        // Get today's attendance
        const { data: todayAttendance } = await supabase
            .from('attendance')
            .select('user_id, type, created_at')
            .gte('created_at', `${today}T00:00:00`)
            .lt('created_at', `${today}T23:59:59`);

        // Process today's stats
        const userStats: Record<string, { checkin?: string; checkout?: string }> = {};

        todayAttendance?.forEach(record => {
            if (!userStats[record.user_id]) {
                userStats[record.user_id] = {};
            }
            if (record.type === 'checkin') {
                userStats[record.user_id].checkin = record.created_at;
            } else {
                userStats[record.user_id].checkout = record.created_at;
            }
        });

        const checkedIn = Object.values(userStats).filter(s => s.checkin).length;
        const complete = Object.values(userStats).filter(s => s.checkin && s.checkout).length;
        const notCheckedIn = totalUsers - checkedIn;

        // Find late employees (check-in after threshold)
        const lateEmployees: Array<{ id: string; name: string; email: string; checkin_time: string }> = [];

        Object.entries(userStats).forEach(([userId, stats]) => {
            if (stats.checkin) {
                const checkinTime = new Date(stats.checkin);
                const [lateHour, lateMinute] = lateThreshold.split(':').map(Number);
                const thresholdTime = new Date(checkinTime);
                thresholdTime.setHours(lateHour, lateMinute, 0, 0);

                if (checkinTime > thresholdTime) {
                    const user = users?.find(u => u.id === userId);
                    if (user) {
                        lateEmployees.push({
                            id: userId,
                            name: user.name,
                            email: user.email,
                            checkin_time: stats.checkin,
                        });
                    }
                }
            }
        });

        // Get weekly data (last 7 days)
        const weeklyData: Array<{ date: string; day: string; present: number; absent: number; complete: number }> = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            const dayName = dayNames[date.getDay()];

            const { data: dayAttendance } = await supabase
                .from('attendance')
                .select('user_id, type')
                .gte('created_at', `${dateStr}T00:00:00`)
                .lt('created_at', `${dateStr}T23:59:59`);

            const dayStats: Record<string, { checkin?: boolean; checkout?: boolean }> = {};
            dayAttendance?.forEach(record => {
                if (!dayStats[record.user_id]) {
                    dayStats[record.user_id] = {};
                }
                if (record.type === 'checkin') {
                    dayStats[record.user_id].checkin = true;
                } else {
                    dayStats[record.user_id].checkout = true;
                }
            });

            const dayPresent = Object.keys(dayStats).length;
            const dayComplete = Object.values(dayStats).filter(s => s.checkin && s.checkout).length;

            weeklyData.push({
                date: dateStr,
                day: dayName,
                present: dayPresent,
                absent: totalUsers - dayPresent,
                complete: dayComplete,
            });
        }

        // Calculate average check-in time
        let avgCheckinMinutes = 0;
        let checkinCount = 0;

        Object.values(userStats).forEach(stats => {
            if (stats.checkin) {
                const time = new Date(stats.checkin);
                avgCheckinMinutes += time.getHours() * 60 + time.getMinutes();
                checkinCount++;
            }
        });

        const avgCheckinTime = checkinCount > 0
            ? `${String(Math.floor(avgCheckinMinutes / checkinCount / 60)).padStart(2, '0')}:${String(Math.round((avgCheckinMinutes / checkinCount) % 60)).padStart(2, '0')}`
            : '--:--';

        // Calculate average work duration
        let totalDurationMinutes = 0;
        let durationCount = 0;

        Object.values(userStats).forEach(stats => {
            if (stats.checkin && stats.checkout) {
                const checkin = new Date(stats.checkin);
                const checkout = new Date(stats.checkout);
                totalDurationMinutes += (checkout.getTime() - checkin.getTime()) / 60000;
                durationCount++;
            }
        });

        const avgWorkDuration = durationCount > 0
            ? `${Math.floor(totalDurationMinutes / durationCount / 60)}j ${Math.round((totalDurationMinutes / durationCount) % 60)}m`
            : '--';

        // Create user summary for today
        const summary = users?.map(user => {
            const stats = userStats[user.id] || {};
            let status: 'not_checked_in' | 'checked_in' | 'complete' = 'not_checked_in';

            if (stats.checkin && stats.checkout) {
                status = 'complete';
            } else if (stats.checkin) {
                status = 'checked_in';
            }

            return {
                user_id: user.id,
                name: user.name,
                email: user.email,
                checkin_time: stats.checkin || null,
                checkout_time: stats.checkout || null,
                status,
            };
        }) || [];

        // Sort: not checked in first, then checked in, then complete
        summary.sort((a, b) => {
            const order = { not_checked_in: 0, checked_in: 1, complete: 2 };
            return order[a.status] - order[b.status];
        });

        return NextResponse.json({
            date: today,
            stats: {
                total: totalUsers,
                checked_in: checkedIn,
                not_checked_in: notCheckedIn,
                complete,
            },
            analytics: {
                avgCheckinTime,
                avgWorkDuration,
                lateCount: lateEmployees.length,
                lateThreshold,
            },
            weeklyData,
            lateEmployees,
            summary,
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
