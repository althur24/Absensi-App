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
    Settings,
    X,
    MapPin
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
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showGpsModal, setShowGpsModal] = useState(false);
    const [gpsStatus, setGpsStatus] = useState<'checking' | 'enabled' | 'disabled' | 'denied'>('checking');

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

    // Check GPS status on mount
    useEffect(() => {
        const checkGps = async () => {
            if (!navigator.geolocation) {
                setGpsStatus('disabled');
                setShowGpsModal(true);
                return;
            }

            try {
                const permission = await navigator.permissions.query({ name: 'geolocation' });

                if (permission.state === 'denied') {
                    setGpsStatus('denied');
                    setShowGpsModal(true);
                } else if (permission.state === 'prompt') {
                    // Try to get location to trigger permission prompt
                    navigator.geolocation.getCurrentPosition(
                        () => setGpsStatus('enabled'),
                        (error) => {
                            if (error.code === error.PERMISSION_DENIED) {
                                setGpsStatus('denied');
                                setShowGpsModal(true);
                            } else {
                                setGpsStatus('disabled');
                                setShowGpsModal(true);
                            }
                        },
                        { timeout: 5000 }
                    );
                } else {
                    setGpsStatus('enabled');
                }

                // Listen for permission changes
                permission.onchange = () => {
                    if (permission.state === 'granted') {
                        setGpsStatus('enabled');
                        setShowGpsModal(false);
                    } else if (permission.state === 'denied') {
                        setGpsStatus('denied');
                        setShowGpsModal(true);
                    }
                };
            } catch {
                // Fallback for browsers that don't support permissions API
                navigator.geolocation.getCurrentPosition(
                    () => setGpsStatus('enabled'),
                    (error) => {
                        if (error.code === error.PERMISSION_DENIED) {
                            setGpsStatus('denied');
                        } else {
                            setGpsStatus('disabled');
                        }
                        setShowGpsModal(true);
                    },
                    { timeout: 5000 }
                );
            }
        };

        checkGps();
    }, []);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
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

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Konfirmasi Logout</h2>
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-700 text-center mb-2">
                                Apakah Anda yakin ingin keluar dari akun?
                            </p>
                            <p className="text-sm text-gray-500 text-center">
                                Anda perlu login kembali untuk mengakses aplikasi.
                            </p>
                        </div>

                        <div className="flex gap-3 p-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={confirmLogout}
                                className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-5 h-5" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GPS Activation Modal */}
            {showGpsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-amber-100 bg-amber-50">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-amber-600" />
                                <h2 className="text-lg font-bold text-amber-900">Aktifkan GPS</h2>
                            </div>
                            <button
                                onClick={() => setShowGpsModal(false)}
                                className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                                <MapPin className="w-8 h-8 text-amber-600" />
                            </div>

                            <div className="text-center">
                                <p className="text-gray-800 font-medium mb-2">
                                    {gpsStatus === 'denied'
                                        ? 'Izin lokasi ditolak!'
                                        : 'GPS tidak aktif!'}
                                </p>
                                <p className="text-gray-600 text-sm">
                                    Aplikasi ini memerlukan akses lokasi untuk melakukan absensi. Silakan aktifkan GPS dan izinkan akses lokasi.
                                </p>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-amber-800 text-sm font-medium mb-2">📱 Cara Mengaktifkan:</p>
                                <ol className="text-amber-700 text-sm space-y-1 list-decimal list-inside">
                                    <li>Buka <span className="font-medium">Pengaturan</span> HP Anda</li>
                                    <li>Pilih <span className="font-medium">Lokasi / GPS</span></li>
                                    <li>Aktifkan toggle <span className="font-medium">Lokasi</span></li>
                                    <li>Kembali ke aplikasi dan <span className="font-medium">refresh halaman</span></li>
                                </ol>
                            </div>
                        </div>

                        <div className="flex gap-3 p-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setShowGpsModal(false)}
                                className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Tutup
                            </button>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
