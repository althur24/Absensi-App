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

        // Timezone Helper: Get WIB Date String (YYYY-MM-DD)
        const getWIBDateStr = (date: Date = new Date()) => {
            return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // Returns YYYY-MM-DD
        };

        const today = searchParams.get('date') || getWIBDateStr();

        const supabase = createServerClient();

        // Get office config & work hours
        const { data: configData } = await supabase
            .from('config')
            .select('*')
            .in('key', ['work_hours']);

        let workHours = { late_threshold: '09:00' };
        if (configData) {
            const wh = configData.find(c => c.key === 'work_hours');
            if (wh) workHours = { ...workHours, ...wh.value };
        }

        const lateThreshold = workHours.late_threshold;

        // Get all active users
        const { data: users } = await supabase
            .from('users')
            .select('id, name, email, division_id, divisions(name)')
            .eq('status', 'active')
            .eq('role', 'user');

        const totalUsers = users?.length || 0;
        const validUserIds = new Set(users?.map(u => u.id));

        // Calculate 7 days ago (WIB based logic)
        const bufferDate = new Date();
        bufferDate.setDate(bufferDate.getDate() - 8);
        const dateLimitStr = bufferDate.toISOString().split('T')[0];

        // OPTIMIZED: Fetch all attendance for the last ~8 days
        const { data: recentAttendance } = await supabase
            .from('attendance')
            .select('user_id, type, created_at')
            .gte('created_at', `${dateLimitStr}T00:00:00`)
            .order('created_at', { ascending: true });

        // Process data in memory
        const weeklyStatsMap: Record<string, Record<string, { checkin?: string; checkout?: string }>> = {};

        // Initialize last 7 days keys (WIB)
        const last7Days: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const wibStr = getWIBDateStr(d);
            last7Days.push(wibStr);
            weeklyStatsMap[wibStr] = {};
        }

        recentAttendance?.forEach(record => {
            if (!validUserIds.has(record.user_id)) return;

            // Convert Record UTC to WIB YYYY-MM-DD
            const recDate = new Date(record.created_at);
            const wibDateStr = getWIBDateStr(recDate);

            // Only process if matches one of our map keys (last 7 days)
            if (weeklyStatsMap[wibDateStr] !== undefined) {
                if (!weeklyStatsMap[wibDateStr][record.user_id]) {
                    weeklyStatsMap[wibDateStr][record.user_id] = {};
                }
                const dayUserStats = weeklyStatsMap[wibDateStr][record.user_id];

                if (record.type === 'checkin') {
                    if (!dayUserStats.checkin) dayUserStats.checkin = record.created_at;
                } else {
                    dayUserStats.checkout = record.created_at;
                }
            }
        });

        // Fetch today's leaves (izin, sakit, cuti, dinas)
        const { data: todayLeaves } = await supabase
            .from('leaves')
            .select('user_id, type, reason')
            .eq('date', today);

        // Fetch leaves for last 7 days (for weekly chart)
        const { data: weeklyLeaves } = await supabase
            .from('leaves')
            .select('user_id, date, type')
            .in('date', last7Days);

        // 1. Process Today's Stats
        const todayUserStats = weeklyStatsMap[today] || {};
        const checkedIn = Object.values(todayUserStats).filter(s => s.checkin).length;
        const complete = Object.values(todayUserStats).filter(s => s.checkin && s.checkout).length;
        const notCheckedIn = totalUsers - checkedIn;

        // 2. Late Employees (Today)
        const lateEmployees: Array<{ id: string; name: string; email: string; checkin_time: string }> = [];
        Object.entries(todayUserStats).forEach(([userId, stats]) => {
            if (stats.checkin) {
                // Convert to WIB HH:MM
                const checkinDate = new Date(stats.checkin);
                const checkinTimeStr = checkinDate.toLocaleTimeString('en-GB', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                if (checkinTimeStr > lateThreshold) {
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

        // 3. Weekly Chart Data
        const weeklyData = last7Days.map(dateStr => {
            const dayStats = weeklyStatsMap[dateStr] || {};
            const dayPresent = Object.keys(dayStats).length;
            const dayComplete = Object.values(dayStats).filter(s => s.checkin && s.checkout).length;

            // Count leaves for this day
            const dayLeaves = weeklyLeaves?.filter(l => l.date === dateStr) || [];
            const dayOnLeave = dayLeaves.length;

            const dayDate = new Date(dateStr);
            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

            return {
                date: dateStr,
                day: dayNames[dayDate.getDay()],
                present: dayPresent,
                on_leave: dayOnLeave,
                absent: Math.max(0, totalUsers - dayPresent - dayOnLeave),
                complete: dayComplete
            };
        });

        // 4. Calculate Averages
        let totalCheckinMinutes = 0;
        let totalCheckinCount = 0;
        let totalDurationMinutes = 0;
        let totalDurationCount = 0;

        Object.values(weeklyStatsMap).forEach(dayUsers => {
            Object.values(dayUsers).forEach(stats => {
                // Avg Checkin (Use WIB Hour/Minute)
                if (stats.checkin) {
                    const time = new Date(stats.checkin);
                    const wibTimeStr = time.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
                    const [h, m] = wibTimeStr.split(':').map(Number);
                    totalCheckinMinutes += h * 60 + m;
                    totalCheckinCount++;
                }
                // Avg Duration
                if (stats.checkin && stats.checkout) {
                    const checkin = new Date(stats.checkin);
                    const checkout = new Date(stats.checkout);
                    const durationMins = (checkout.getTime() - checkin.getTime()) / 60000;
                    if (durationMins > 0) {
                        totalDurationMinutes += durationMins;
                        totalDurationCount++;
                    }
                }
            });
        });

        const avgCheckinTime = totalCheckinCount > 0
            ? `${String(Math.floor(totalCheckinMinutes / totalCheckinCount / 60)).padStart(2, '0')}:${String(Math.round((totalCheckinMinutes / totalCheckinCount) % 60)).padStart(2, '0')}`
            : '--:--';

        let avgWorkDuration = '--';
        if (totalDurationCount > 0) {
            const avgMins = totalDurationMinutes / totalDurationCount;
            const hours = Math.floor(avgMins / 60);
            const minutes = Math.round(avgMins % 60);

            if (hours > 0) {
                avgWorkDuration = `${hours}j ${minutes}m`;
            } else {
                avgWorkDuration = `${minutes}m`;
            }
        }

        // 5. User Summary
        const summary = users?.map(user => {
            const stats = todayUserStats[user.id] || {};
            const leave = todayLeaves?.find(l => l.user_id === user.id);
            let status: 'not_checked_in' | 'checked_in' | 'complete' | 'on_leave' = 'not_checked_in';
            let leaveInfo = null;

            if (leave) {
                status = 'on_leave';
                leaveInfo = {
                    type: leave.type,
                    reason: leave.reason
                };
            } else if (stats.checkin && stats.checkout) {
                status = 'complete';
            } else if (stats.checkin) {
                status = 'checked_in';
            }

            return {
                user_id: user.id,
                name: user.name,
                email: user.email,
                division: (user as typeof user & { divisions?: { name: string } }).divisions?.name || null,
                checkin_time: stats.checkin || null,
                checkout_time: stats.checkout || null,
                status,
                leave: leaveInfo,
            };
        }) || [];

        summary.sort((a, b) => {
            const order = { not_checked_in: 0, on_leave: 1, checked_in: 2, complete: 3 };
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
