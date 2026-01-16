'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatTime } from '@/lib/utils';
import {
    LogOut,
    Users,
    ClipboardList,
    MapPin,
    UserCheck,
    UserX,
    CheckCircle2,
    Clock,
    TrendingUp,
    AlertTriangle,
    Timer,
    Calendar,
    BarChart3,
    PieChartIcon,
    CalendarOff,
    Settings,
    FileSpreadsheet,
    X,
    History,
    Trash2,
    Loader2,
    Search,
    LogIn,
    HelpCircle
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

interface UserSummary {
    user_id: string;
    name: string;
    email: string;
    division: string | null;
    checkin_time: string | null;
    checkout_time: string | null;
    status: 'not_checked_in' | 'checked_in' | 'complete' | 'on_leave';
    leave?: { type: string; reason?: string } | null;
}

interface WeeklyData {
    date: string;
    day: string;
    present: number;
    on_leave: number;
    absent: number;
    complete: number;
}

interface LateEmployee {
    id: string;
    name: string;
    email: string;
    checkin_time: string;
}

interface DashboardData {
    date: string;
    summary: UserSummary[];
    stats: {
        total: number;
        checked_in: number;
        not_checked_in: number;
        complete: number;
    };
    analytics: {
        avgCheckinTime: string;
        avgWorkDuration: string;
        lateCount: number;
        lateThreshold: string;
    };
    weeklyData: WeeklyData[];
    lateEmployees: LateEmployee[];
}

const COLORS = ['#22C55E', '#F59E0B', '#EF4444']; // Lengkap=green, Belum Pulang=amber, Belum Absen=red

export default function AdminDashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'late' | 'employees'>('overview');
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showCleanupReminder, setShowCleanupReminder] = useState(false);
    const [cleanupLoading, setCleanupLoading] = useState(false);
    const [cleanupStats, setCleanupStats] = useState<{ photos_older_than_30_days: number; estimated_cleanup_mb: number } | null>(null);
    const [selectedDate, setSelectedDate] = useState(() => {
        // Default to today in YYYY-MM-DD format
        const now = new Date();
        return now.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD
    });
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [assistModal, setAssistModal] = useState<{ show: boolean; user: { id: string; name: string; status: string } | null; action: 'checkin' | 'checkout' | null }>({ show: false, user: null, action: null });
    const [assistLoading, setAssistLoading] = useState(false);
    const [activityLogs, setActivityLogs] = useState<Array<{
        id: string;
        admin_name: string;
        action: string;
        details: Record<string, unknown>;
        created_at: string;
    }>>([]);

    const fetchData = useCallback(async () => {
        try {
            const meRes = await fetch('/api/auth/me');
            if (!meRes.ok) {
                router.push('/login');
                return;
            }
            const meData = await meRes.json();
            if (meData.user.role !== 'admin') {
                router.push('/dashboard');
                return;
            }

            const dashRes = await fetch(`/api/admin/dashboard?date=${selectedDate}`);
            if (dashRes.ok) {
                const dashData = await dashRes.json();
                setData(dashData);
            }

            // Fetch activity logs
            const logsRes = await fetch('/api/admin/logs?limit=10');
            if (logsRes.ok) {
                const logsData = await logsRes.json();
                setActivityLogs(logsData.logs || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [router, selectedDate]);

    // Check if cleanup reminder should be shown
    const checkCleanupReminder = useCallback(async () => {
        const lastCleanup = localStorage.getItem('lastStorageCleanup');
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        if (!lastCleanup || parseInt(lastCleanup) < thirtyDaysAgo) {
            // Check if there are old photos
            try {
                const res = await fetch('/api/admin/cleanup');
                if (res.ok) {
                    const stats = await res.json();
                    if (stats.photos_older_than_30_days > 0) {
                        setCleanupStats(stats);
                        setShowCleanupReminder(true);
                    }
                }
            } catch (e) {
                console.error('Cleanup check error:', e);
            }
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!loading && data) {
            checkCleanupReminder();
        }
    }, [loading, data, checkCleanupReminder]);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const handleCleanup = async () => {
        setCleanupLoading(true);
        try {
            const res = await fetch('/api/admin/cleanup', { method: 'POST' });
            if (res.ok) {
                const result = await res.json();
                localStorage.setItem('lastStorageCleanup', Date.now().toString());
                setShowCleanupReminder(false);
                alert(`✅ Cleanup berhasil!\n\n${result.deleted} foto dihapus.\nPerkiraan ruang yang dihemat: ${result.estimated_saved_mb} MB`);
            } else {
                alert('Gagal melakukan cleanup. Coba lagi.');
            }
        } catch (e) {
            console.error('Cleanup error:', e);
            alert('Terjadi kesalahan saat cleanup.');
        } finally {
            setCleanupLoading(false);
        }
    };

    const dismissCleanupReminder = () => {
        setShowCleanupReminder(false);
        // Will show again next time dashboard is opened
    };

    const handleAssistAttendance = async () => {
        if (!assistModal.user || !assistModal.action) return;

        setAssistLoading(true);
        try {
            const res = await fetch('/api/admin/assist-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: assistModal.user.id,
                    action: assistModal.action,
                    reason: 'HP tidak bisa digunakan'
                })
            });

            const result = await res.json();

            if (res.ok) {
                alert(`✅ ${result.message}`);
                setAssistModal({ show: false, user: null, action: null });
                fetchData(); // Refresh data
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (e) {
            console.error('Assist error:', e);
            alert('Terjadi kesalahan');
        } finally {
            setAssistLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-teal-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const pieData = data ? [
        { name: 'Lengkap', value: data.stats.complete, color: '#22C55E' },
        { name: 'Belum Pulang', value: data.stats.checked_in - data.stats.complete, color: '#F59E0B' },
        { name: 'Belum Absen', value: data.stats.not_checked_in, color: '#EF4444' },
    ].filter(d => d.value > 0) : [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'complete': return 'bg-green-100 text-green-700 border-green-200';
            case 'checked_in': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'on_leave': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-red-100 text-red-700 border-red-200';
        }
    };

    const getStatusText = (status: string, leave?: { type: string; reason?: string } | null) => {
        switch (status) {
            case 'complete': return 'Lengkap';
            case 'checked_in': return 'Belum Pulang';
            case 'on_leave':
                const leaveType = leave?.type ? leave.type.charAt(0).toUpperCase() + leave.type.slice(1) : 'Izin';
                return leave?.reason ? `${leaveType}: ${leave.reason}` : leaveType;
            default: return 'Belum Absen';
        }
    };

    return (
        <div className="min-h-screen bg-teal-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-teal-600 to-teal-500 text-white">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-4 h-4 text-teal-100" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent border border-white/30 rounded-lg px-2 py-1 text-sm text-white cursor-pointer hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                                {selectedDate !== new Date().toLocaleDateString('en-CA') && (
                                    <button
                                        onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA'))}
                                        className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors"
                                    >
                                        Hari Ini
                                    </button>
                                )}
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

            <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {/* Quick Links */}
                <div className="flex gap-3 flex-wrap">
                    <a
                        href="/admin/users"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm hover:shadow-md border border-teal-100 hover:border-teal-300 transition-all"
                    >
                        <Users className="w-5 h-5 text-teal-600" />
                        <span className="font-medium text-teal-900">Kelola User</span>
                    </a>
                    <a
                        href="/admin/leaves"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm hover:shadow-md border border-amber-100 hover:border-amber-300 transition-all"
                    >
                        <CalendarOff className="w-5 h-5 text-amber-600" />
                        <span className="font-medium text-teal-900">Kelola Izin</span>
                    </a>
                    <a
                        href="/admin/attendance"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm hover:shadow-md border border-teal-100 hover:border-teal-300 transition-all"
                    >
                        <ClipboardList className="w-5 h-5 text-teal-600" />
                        <span className="font-medium text-teal-900">Riwayat Absensi</span>
                    </a>
                    <a
                        href="/admin/settings"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm hover:shadow-md border border-teal-100 hover:border-teal-300 transition-all"
                    >
                        <Settings className="w-5 h-5 text-teal-600" />
                        <span className="font-medium text-teal-900">Pengaturan</span>
                    </a>
                    <a
                        href="/admin/reports"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm hover:shadow-md border border-green-100 hover:border-green-300 transition-all"
                    >
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-teal-900">Laporan</span>
                    </a>
                </div>

                {/* All Stats Cards - 8 cards total */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Row 1 on Desktop */}
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-teal-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Users className="w-4 h-4 text-teal-500 shrink-0" />
                            <p className="text-gray-500 text-xs sm:text-sm">Total Karyawan</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-teal-900">{data?.stats.total || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-green-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <UserCheck className="w-4 h-4 text-green-500 shrink-0" />
                            <p className="text-gray-500 text-xs sm:text-sm">Sudah Check In</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-green-600">{data?.stats.checked_in || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-amber-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            <p className="text-gray-500 text-xs sm:text-sm">Belum Pulang</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-amber-600">{(data?.stats.checked_in || 0) - (data?.stats.complete || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-red-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <UserX className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="text-gray-500 text-xs sm:text-sm">Belum Absen</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-red-600">{data?.stats.not_checked_in || 0}</p>
                    </div>

                    {/* Row 2 on Desktop */}
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-indigo-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                            <p className="text-gray-500 text-xs sm:text-sm">Lengkap</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{data?.stats.complete || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-teal-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Timer className="w-4 h-4 text-teal-500 shrink-0" />
                            <p className="text-gray-500 text-xs sm:text-sm">Rata-rata Durasi</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-teal-900">{data?.analytics.avgWorkDuration || '--'}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-orange-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                            <p className="text-gray-500 text-xs sm:text-sm">Terlambat</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-orange-600">{data?.analytics.lateCount || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                            <p className="text-gray-500 text-xs sm:text-sm">Kehadiran</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
                            {data?.stats.total ? Math.round((data.stats.checked_in / data.stats.total) * 100) : 0}%
                        </p>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Weekly Bar Chart */}
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-teal-100">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-teal-600" />
                            <h3 className="font-semibold text-teal-900">Kehadiran 7 Hari Terakhir</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.weeklyData || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                    <Bar dataKey="present" name="Hadir" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="on_leave" name="Izin" fill="#6366F1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="absent" name="Tidak Hadir" fill="#F87171" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-teal-100">
                        <div className="flex items-center gap-2 mb-4">
                            <PieChartIcon className="w-5 h-5 text-teal-600" />
                            <h3 className="font-semibold text-teal-900">Status Hari Ini</h3>
                        </div>
                        <div className="h-64 sm:h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((item, index) => (
                                            <Cell key={`cell-${index}`} fill={item.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${value} orang`, name]} />
                                    <Legend
                                        layout="horizontal"
                                        verticalAlign="bottom"
                                        align="center"
                                        wrapperStyle={{ paddingTop: '15px' }}
                                        formatter={(value, entry) => {
                                            const item = pieData.find(d => d.name === value);
                                            return `${value}: ${item?.value || 0}`;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-teal-200">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'overview'
                            ? 'text-teal-600 border-b-2 border-teal-600'
                            : 'text-gray-500 hover:text-teal-600'
                            }`}
                    >
                        Status Karyawan
                    </button>
                    <button
                        onClick={() => setActiveTab('late')}
                        className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'late'
                            ? 'text-teal-600 border-b-2 border-teal-600'
                            : 'text-gray-500 hover:text-teal-600'
                            }`}
                    >
                        Terlambat
                        {(data?.lateEmployees?.length || 0) > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                {data?.lateEmployees?.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-teal-100">
                        <div className="px-4 py-3 border-b border-teal-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-teal-600" />
                                <h2 className="font-semibold text-teal-900">Status Karyawan Hari Ini</h2>
                            </div>
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Cari nama..."
                                    value={employeeSearch}
                                    onChange={e => setEmployeeSearch(e.target.value)}
                                    className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none w-48"
                                />
                            </div>
                        </div>
                        <div className="divide-y divide-teal-50 max-h-96 overflow-y-auto">
                            {data?.summary?.filter(user =>
                                !employeeSearch ||
                                user.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                                user.email.toLowerCase().includes(employeeSearch.toLowerCase())
                            ).length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    {employeeSearch ? 'Tidak ditemukan karyawan dengan nama tersebut' : 'Tidak ada karyawan aktif'}
                                </div>
                            ) : (
                                data?.summary?.filter(user =>
                                    !employeeSearch ||
                                    user.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                                    user.email.toLowerCase().includes(employeeSearch.toLowerCase())
                                ).map((user) => (
                                    <div key={user.user_id} className="px-4 py-3 flex items-center justify-between hover:bg-teal-50/50 transition-colors">
                                        <div>
                                            <p className="font-medium text-teal-900">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                            {user.division && (
                                                <p className="text-xs text-teal-600 mt-0.5">{user.division}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Assist Buttons */}
                                            {user.status === 'not_checked_in' && !user.leave && selectedDate === new Date().toLocaleDateString('en-CA') && (
                                                <button
                                                    onClick={() => setAssistModal({ show: true, user: { id: user.user_id, name: user.name, status: user.status }, action: 'checkin' })}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-xs font-medium"
                                                    title="Bantu Absen Masuk"
                                                >
                                                    <LogIn className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Bantu Masuk</span>
                                                </button>
                                            )}
                                            {user.status === 'checked_in' && selectedDate === new Date().toLocaleDateString('en-CA') && (
                                                <button
                                                    onClick={() => setAssistModal({ show: true, user: { id: user.user_id, name: user.name, status: user.status }, action: 'checkout' })}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-xs font-medium"
                                                    title="Bantu Absen Pulang"
                                                >
                                                    <LogOut className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Bantu Pulang</span>
                                                </button>
                                            )}
                                            <div className="text-right">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                                                    {getStatusText(user.status, user.leave)}
                                                </span>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {user.checkin_time && (
                                                        <span>In: {formatTime(user.checkin_time)}</span>
                                                    )}
                                                    {user.checkout_time && (
                                                        <span className="ml-2">Out: {formatTime(user.checkout_time)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'late' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-amber-100">
                        <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2 bg-amber-50">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <h2 className="font-semibold text-amber-900">Karyawan Terlambat Hari Ini</h2>
                            <span className="text-sm text-amber-600">(Check-in setelah {data?.analytics.lateThreshold || '09:00'})</span>
                        </div>
                        <div className="divide-y divide-amber-50">
                            {data?.lateEmployees?.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
                                    <p>Tidak ada karyawan terlambat hari ini!</p>
                                </div>
                            ) : (
                                data?.lateEmployees?.map((emp) => (
                                    <div key={emp.id} className="px-4 py-3 flex items-center justify-between hover:bg-amber-50/50 transition-colors">
                                        <div>
                                            <p className="font-medium text-gray-900">{emp.name}</p>
                                            <p className="text-sm text-gray-500">{emp.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                                Check-in: {formatTime(emp.checkin_time)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Activity Log Section */}
                <div className="bg-white rounded-xl shadow-sm border border-teal-100 mt-6">
                    <div className="px-4 py-3 border-b border-teal-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-teal-600" />
                            <h3 className="font-semibold text-teal-900">Aktivitas Admin Terbaru</h3>
                        </div>
                    </div>
                    <div className="divide-y divide-teal-50 max-h-64 overflow-y-auto">
                        {activityLogs.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <History className="w-12 h-12 text-teal-200 mx-auto mb-3" />
                                <p>Belum ada aktivitas tercatat</p>
                            </div>
                        ) : (
                            activityLogs.map((log) => {
                                const actionLabels: Record<string, string> = {
                                    user_create: 'Menambah User Baru',
                                    user_update: 'Mengubah Data User',
                                    user_delete: 'Menghapus User',
                                    user_reset_password: 'Reset Kata Kunci',
                                    user_toggle_status: 'Ubah Status User',
                                    config_update_location: 'Ubah Lokasi Kantor',
                                    config_update_hours: 'Ubah Jam Kerja',
                                    leave_approve: 'Setujui Izin',
                                    leave_reject: 'Tolak Izin',
                                    division_create: 'Tambah Divisi',
                                    division_update: 'Ubah Divisi',
                                    division_delete: 'Hapus Divisi',
                                };
                                const logTime = new Date(log.created_at).toLocaleString('id-ID', {
                                    timeZone: 'Asia/Jakarta',
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                });
                                const details = log.details as Record<string, string>;
                                return (
                                    <div key={log.id} className="px-4 py-3 hover:bg-teal-50/50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{log.admin_name}</p>
                                                <p className="text-sm text-teal-600">{actionLabels[log.action] || log.action}</p>
                                                {details?.user_name && (
                                                    <p className="text-xs text-gray-500 mt-1">User: {details.user_name}</p>
                                                )}
                                                {details?.division_name && (
                                                    <p className="text-xs text-gray-500 mt-1">Divisi: {details.division_name}</p>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400">{logTime}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
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
                                Anda perlu masuk kembali untuk mengakses aplikasi.
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
                                Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cleanup Reminder Modal */}
            {showCleanupReminder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-amber-100 bg-amber-50 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-amber-600" />
                                <h2 className="text-lg font-bold text-amber-900">Pengingat Bersihkan Storage</h2>
                            </div>
                            <button
                                onClick={dismissCleanupReminder}
                                className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-amber-600" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center justify-center mb-4">
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                                </div>
                            </div>
                            <p className="text-gray-700 text-center mb-4">
                                Sudah lebih dari <strong>30 hari</strong> sejak terakhir membersihkan storage foto absensi.
                            </p>
                            {cleanupStats && (
                                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-600">Foto lama (&gt;30 hari):</span>
                                        <span className="font-bold text-gray-900">{cleanupStats.photos_older_than_30_days} foto</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Perkiraan ruang:</span>
                                        <span className="font-bold text-amber-600">~{cleanupStats.estimated_cleanup_mb} MB</span>
                                    </div>
                                </div>
                            )}
                            <p className="text-sm text-gray-500 text-center">
                                Membersihkan foto lama akan menghemat ruang storage Supabase Anda.
                            </p>
                        </div>

                        <div className="flex gap-3 p-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={dismissCleanupReminder}
                                className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Nanti Saja
                            </button>
                            <button
                                type="button"
                                onClick={handleCleanup}
                                disabled={cleanupLoading}
                                className="flex-1 py-3 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {cleanupLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Membersihkan...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-5 h-5" />
                                        Bersihkan Sekarang
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assist Attendance Modal */}
            {assistModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-teal-100 bg-teal-50 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-teal-600" />
                                <h2 className="text-lg font-bold text-teal-900">Bantu Absensi</h2>
                            </div>
                            <button
                                onClick={() => setAssistModal({ show: false, user: null, action: null })}
                                className="p-2 hover:bg-teal-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-teal-600" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="text-center mb-4">
                                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${assistModal.action === 'checkin' ? 'bg-green-100' : 'bg-amber-100'
                                    }`}>
                                    {assistModal.action === 'checkin' ? (
                                        <LogIn className="w-8 h-8 text-green-600" />
                                    ) : (
                                        <LogOut className="w-8 h-8 text-amber-600" />
                                    )}
                                </div>
                                <p className="text-lg font-semibold text-gray-900">
                                    {assistModal.action === 'checkin' ? 'Bantu Check-in' : 'Bantu Check-out'}
                                </p>
                                <p className="text-gray-600 mt-2">
                                    Anda akan membantu <strong>{assistModal.user?.name}</strong> untuk {assistModal.action === 'checkin' ? 'check-in' : 'check-out'} karena HP tidak bisa digunakan.
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                                <p>⚠️ Catatan: Absensi ini akan dicatat sebagai &quot;Dibantu oleh Admin&quot; tanpa foto dan lokasi GPS.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 p-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setAssistModal({ show: false, user: null, action: null })}
                                className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleAssistAttendance}
                                disabled={assistLoading}
                                className={`flex-1 py-3 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${assistModal.action === 'checkin' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'
                                    }`}
                            >
                                {assistLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        {assistModal.action === 'checkin' ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                                        Konfirmasi
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
