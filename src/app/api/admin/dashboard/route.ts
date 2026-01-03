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

        const validUserIds = new Set(users?.map(u => u.id));

        // Calculate 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Includes today so -6
        const dateLimitStr = sevenDaysAgo.toISOString().split('T')[0];

        // OPTIMIZED: Fetch all attendance for the last 7 days in one query
        const { data: recentAttendance } = await supabase
            .from('attendance')
            .select('user_id, type, created_at')
            .gte('created_at', `${dateLimitStr}T00:00:00`)
            .order('created_at', { ascending: true });

        // Process data in memory
        const todayData: typeof recentAttendance = [];
        const weeklyStatsMap: Record<string, Record<string, { checkin?: string; checkout?: string }>> = {};
        // Map<DateString, Map<UserId, {checkin, checkout}>>

        // Initialize weekly map structure for all 7 days
        const last7Days: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            last7Days.push(dStr);
            weeklyStatsMap[dStr] = {};
        }

        recentAttendance?.forEach(record => {
            // Skip non-active users (e.g. Admin)
            if (!validUserIds.has(record.user_id)) return;

            const recordDate = record.created_at.split('T')[0];

            // Filter for Today's specific processing
            if (recordDate === today) {
                todayData.push(record);
            }

            // Populate Weekly Stats Map
            if (weeklyStatsMap[recordDate]) {
                if (!weeklyStatsMap[recordDate][record.user_id]) {
                    weeklyStatsMap[recordDate][record.user_id] = {};
                }
                const dayUserStats = weeklyStatsMap[recordDate][record.user_id];

                if (record.type === 'checkin') {
                    // Keep earliest checkin if duplicates exist (though UI prevents it, safety net)
                    if (!dayUserStats.checkin) dayUserStats.checkin = record.created_at;
                } else {
                    // Keep latest checkout
                    dayUserStats.checkout = record.created_at;
                }
            }
        });

        // 1. Process Today's Stats (for Cards & List)
        const todayUserStats = weeklyStatsMap[today] || {};
        const checkedIn = Object.values(todayUserStats).filter(s => s.checkin).length;
        const complete = Object.values(todayUserStats).filter(s => s.checkin && s.checkout).length;
        const notCheckedIn = totalUsers - checkedIn;

        // 2. Late Employees (Today)
        const lateEmployees: Array<{ id: string; name: string; email: string; checkin_time: string }> = [];
        Object.entries(todayUserStats).forEach(([userId, stats]) => {
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

        // 3. Weekly Chart Data construction
        const weeklyData = last7Days.map(dateStr => {
            const dayStats = weeklyStatsMap[dateStr];
            const dayPresent = Object.keys(dayStats).length;
            const dayComplete = Object.values(dayStats).filter(s => s.checkin && s.checkout).length;
            const dayDate = new Date(dateStr);
            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

            return {
                date: dateStr,
                day: dayNames[dayDate.getDay()],
                present: dayPresent,
                absent: totalUsers - dayPresent,
                complete: dayComplete
            };
        });

        // 4. Calculate Averages (Using 7 Days Data) for smoother metrics
        let totalCheckinMinutes = 0;
        let totalCheckinCount = 0;
        let totalDurationMinutes = 0;
        let totalDurationCount = 0;

        // Iterate over all days in the map
        Object.values(weeklyStatsMap).forEach(dayUsers => {
            Object.values(dayUsers).forEach(stats => {
                // Avg Checkin Time
                if (stats.checkin) {
                    const time = new Date(stats.checkin);
                    totalCheckinMinutes += time.getHours() * 60 + time.getMinutes();
                    totalCheckinCount++;
                }
                // Avg Duration
                if (stats.checkin && stats.checkout) {
                    const checkin = new Date(stats.checkin);
                    const checkout = new Date(stats.checkout);
                    const durationMins = (checkout.getTime() - checkin.getTime()) / 60000;
                    if (durationMins > 0) { // Safety check
                        totalDurationMinutes += durationMins;
                        totalDurationCount++;
                    }
                }
            });
        });

        const avgCheckinTime = totalCheckinCount > 0
            ? `${String(Math.floor(totalCheckinMinutes / totalCheckinCount / 60)).padStart(2, '0')}:${String(Math.round((totalCheckinMinutes / totalCheckinCount) % 60)).padStart(2, '0')}`
            : '--:--';

        const avgWorkDuration = totalDurationCount > 0
            ? `${Math.floor(totalDurationMinutes / totalDurationCount / 60)}j ${Math.round((totalDurationMinutes / totalDurationCount) % 60)}m`
            : '--';

        // 5. User Summary (Today)
        const summary = users?.map(user => {
            const stats = todayUserStats[user.id] || {};
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

        // Sort: not checked in first
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
