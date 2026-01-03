'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatTime } from '@/lib/utils';
import { Attendance } from '@/types';
import { ArrowLeft, Clock, MapPin, CheckCircle2, LogOut as LogOutIcon, Calendar } from 'lucide-react';

export default function HistoryPage() {
    const router = useRouter();
    const [records, setRecords] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchHistory() {
        try {
            const meRes = await fetch('/api/auth/me');
            if (!meRes.ok) {
                router.push('/login');
                return;
            }

            const res = await fetch('/api/attendance/history?limit=50');
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
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
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
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
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {records.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center border border-teal-100">
                        <Clock className="w-12 h-12 text-teal-300 mx-auto mb-3" />
                        <p className="text-gray-500">Belum ada riwayat absensi</p>
                    </div>
                ) : (
                    <div className="space-y-3">
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
                                                {record.type === 'checkin' ? 'Check In' : 'Check Out'}
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
