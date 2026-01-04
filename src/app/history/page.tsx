'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatTime } from '@/lib/utils';
import { Attendance } from '@/types';
import { ArrowLeft, Clock, MapPin, CheckCircle2, LogOut as LogOutIcon, Calendar, Search, X, ChevronDown } from 'lucide-react';

export default function HistoryPage() {
    const router = useRouter();
    const [records, setRecords] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);

    // Date filter states
    const [showFilter, setShowFilter] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterApplied, setFilterApplied] = useState(false);

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchHistory(start?: string, end?: string) {
        setLoading(true);
        try {
            const meRes = await fetch('/api/auth/me');
            if (!meRes.ok) {
                router.push('/login');
                return;
            }

            let url = '/api/attendance/history?limit=100';
            if (start) url += `&startDate=${start}`;
            if (end) url += `&endDate=${end}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setRecords(data.attendance || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const applyFilter = () => {
        if (startDate || endDate) {
            fetchHistory(startDate, endDate);
            setFilterApplied(true);
            setShowFilter(false);
        }
    };

    const clearFilter = () => {
        setStartDate('');
        setEndDate('');
        setFilterApplied(false);
        fetchHistory();
        setShowFilter(false);
    };

    // Quick filter helpers
    const setToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
    };

    const setThisWeek = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        setStartDate(monday.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    };

    const setThisMonth = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    };

    if (loading && !filterApplied) {
        return (
            <div className="min-h-screen bg-teal-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-teal-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-teal-100">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-teal-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-teal-600" />
                            <h1 className="text-xl font-bold text-teal-900">Riwayat Absensi</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${filterApplied ? 'bg-teal-100 text-teal-700' : 'hover:bg-teal-50 text-teal-600'
                            }`}
                    >
                        <Search className="w-5 h-5" />
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilter ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilter && (
                    <div className="border-t border-teal-100 bg-teal-50 px-4 py-4 animate-in slide-in-from-top-2">
                        <div className="max-w-lg mx-auto space-y-4">
                            {/* Quick Filters */}
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={setToday}
                                    className="px-3 py-1.5 bg-white border border-teal-200 rounded-lg text-sm text-teal-700 hover:bg-teal-100 transition-colors"
                                >
                                    Hari Ini
                                </button>
                                <button
                                    onClick={setThisWeek}
                                    className="px-3 py-1.5 bg-white border border-teal-200 rounded-lg text-sm text-teal-700 hover:bg-teal-100 transition-colors"
                                >
                                    Minggu Ini
                                </button>
                                <button
                                    onClick={setThisMonth}
                                    className="px-3 py-1.5 bg-white border border-teal-200 rounded-lg text-sm text-teal-700 hover:bg-teal-100 transition-colors"
                                >
                                    Bulan Ini
                                </button>
                            </div>

                            {/* Date Inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Dari Tanggal</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={applyFilter}
                                    disabled={!startDate && !endDate}
                                    className="flex-1 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    <Search className="w-4 h-4" />
                                    Cari
                                </button>
                                {filterApplied && (
                                    <button
                                        onClick={clearFilter}
                                        className="px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Filter Indicator */}
                {filterApplied && !showFilter && (
                    <div className="border-t border-teal-100 bg-teal-50 px-4 py-2">
                        <div className="max-w-lg mx-auto flex items-center justify-between">
                            <span className="text-sm text-teal-700">
                                📅 {startDate && formatDate(startDate + 'T00:00:00')}
                                {startDate && endDate && ' - '}
                                {endDate && formatDate(endDate + 'T00:00:00')}
                            </span>
                            <button
                                onClick={clearFilter}
                                className="text-sm text-teal-600 hover:text-teal-800 flex items-center gap-1"
                            >
                                <X className="w-4 h-4" />
                                Hapus Filter
                            </button>
                        </div>
                    </div>
                )}
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center border border-teal-100">
                        <Clock className="w-12 h-12 text-teal-300 mx-auto mb-3" />
                        <p className="text-gray-500">
                            {filterApplied
                                ? 'Tidak ada riwayat absensi pada tanggal tersebut'
                                : 'Belum ada riwayat absensi'}
                        </p>
                        {filterApplied && (
                            <button
                                onClick={clearFilter}
                                className="mt-4 text-teal-600 hover:text-teal-800 text-sm font-medium"
                            >
                                Lihat Semua Riwayat
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Results count */}
                        <p className="text-sm text-gray-500 mb-2">
                            Menampilkan {records.length} catatan absensi
                        </p>

                        {records.map((record) => (
                            <div
                                key={record.id}
                                className="bg-white rounded-xl p-4 border border-teal-100 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${record.type === 'checkin'
                                            ? 'bg-green-100'
                                            : 'bg-indigo-100'
                                            }`}>
                                            {record.type === 'checkin' ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <LogOutIcon className="w-5 h-5 text-indigo-600" />
                                            )}
                                        </div>
                                        <div>
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${record.type === 'checkin'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                {record.type === 'checkin' ? 'Absen Masuk' : 'Absen Pulang'}
                                            </span>
                                            <p className="text-teal-900 font-medium mt-1">
                                                {formatDate(record.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-teal-900">
                                            {formatTime(record.created_at)}
                                        </p>
                                        <a
                                            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
                                        >
                                            <MapPin className="w-3 h-3" />
                                            Lokasi
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
