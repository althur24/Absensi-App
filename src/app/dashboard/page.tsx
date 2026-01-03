'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AttendanceButton from '@/components/AttendanceButton';
import { formatTime } from '@/lib/utils';
import { SessionUser, Attendance } from '@/types';
import {
    ArrowLeft,
    LogOut,
    Clock,
    CheckCircle2,
    CircleDot,
    History,
    Settings
} from 'lucide-react';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<SessionUser | null>(null);
    const [todayStatus, setTodayStatus] = useState<{
        hasCheckedIn: boolean;
        hasCheckedOut: boolean;
        checkin?: Attendance;
        checkout?: Attendance;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const meRes = await fetch('/api/auth/me');
            if (!meRes.ok) {
                router.push('/login');
                return;
            }
            const meData = await meRes.json();

            if (meData.user.is_first_login) {
                router.push('/change-password');
                return;
            }

            setUser(meData.user);

            const todayRes = await fetch('/api/attendance/today');
            if (todayRes.ok) {
                const todayData = await todayRes.json();
                setTodayStatus(todayData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleLogout = async () => {
        if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        }
    };

    const handleAttendanceSuccess = () => {
        fetchData();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-teal-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Selamat Pagi' : now.getHours() < 18 ? 'Selamat Siang' : 'Selamat Malam';

    return (
        <div className="min-h-screen bg-teal-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-teal-600 to-teal-500 text-white">
                <div className="max-w-lg mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {user?.role === 'admin' && (
                                <button
                                    onClick={() => router.push('/admin')}
                                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                                    title="Kembali ke Admin"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                            )}
                            <div>
                                <p className="text-teal-100 text-sm">{greeting} 👋</p>
                                <h1 className="text-xl font-bold">{user?.name}</h1>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full hover:bg-white/20 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Today's Status Card */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-teal-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-teal-900">Status Hari Ini</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Check In Status */}
                        <div className={`p-4 rounded-xl border-2 transition-all ${todayStatus?.hasCheckedIn
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                <CircleDot className={`w-4 h-4 ${todayStatus?.hasCheckedIn ? 'text-green-500' : 'text-gray-400'}`} />
                                <span className="text-sm font-medium text-gray-600">Check In</span>
                            </div>
                            <p className={`text-xl font-bold ${todayStatus?.hasCheckedIn ? 'text-green-700' : 'text-gray-400'}`}>
                                {todayStatus?.checkin ? formatTime(todayStatus.checkin.created_at) : '--:--'}
                            </p>
                        </div>

                        {/* Check Out Status */}
                        <div className={`p-4 rounded-xl border-2 transition-all ${todayStatus?.hasCheckedOut
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                <CircleDot className={`w-4 h-4 ${todayStatus?.hasCheckedOut ? 'text-indigo-500' : 'text-gray-400'}`} />
                                <span className="text-sm font-medium text-gray-600">Check Out</span>
                            </div>
                            <p className={`text-xl font-bold ${todayStatus?.hasCheckedOut ? 'text-indigo-700' : 'text-gray-400'}`}>
                                {todayStatus?.checkout ? formatTime(todayStatus.checkout.created_at) : '--:--'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    {!todayStatus?.hasCheckedIn && (
                        <>
                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                                <p className="text-teal-800 text-sm text-center">
                                    👋 <span className="font-medium">Selamat datang!</span> Tekan tombol di bawah ini untuk melakukan <span className="font-semibold">Check In</span> hari ini.
                                </p>
                            </div>
                            <AttendanceButton
                                type="checkin"
                                onSuccess={handleAttendanceSuccess}
                            />
                        </>
                    )}

                    {todayStatus?.hasCheckedIn && !todayStatus?.hasCheckedOut && (
                        <>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                <p className="text-indigo-800 text-sm text-center">
                                    ✅ Anda sudah <span className="font-semibold">Check In</span>. Jangan lupa <span className="font-semibold">Check Out</span> saat pulang dengan menekan tombol di bawah ini.
                                </p>
                            </div>
                            <AttendanceButton
                                type="checkout"
                                onSuccess={handleAttendanceSuccess}
                            />
                        </>
                    )}

                    {todayStatus?.hasCheckedIn && todayStatus?.hasCheckedOut && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <p className="text-green-700 font-medium">Absensi hari ini sudah lengkap!</p>
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-4">
                    <a
                        href="/history"
                        className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-teal-300 border-2 border-transparent transition-all"
                    >
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <History className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="font-medium text-teal-900">Riwayat</span>
                    </a>

                    {user?.role === 'admin' && (
                        <a
                            href="/admin"
                            className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-teal-300 border-2 border-transparent transition-all"
                        >
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Settings className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="font-medium text-teal-900">Admin</span>
                        </a>
                    )}
                </div>
            </main>
        </div>
    );
}
