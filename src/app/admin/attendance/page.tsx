'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatTime, getMapLink, getTodayDate } from '@/lib/utils';
import { Attendance, User } from '@/types';
import {
    ArrowLeft,
    ClipboardList,
    Calendar,
    X,
    MapPin,
    Clock,
    CheckCircle2,
    LogOut as LogOutIcon,
    Smartphone,
    Eye,
    Image,
    Filter,
    Building2
} from 'lucide-react';

interface Division {
    id: string;
    name: string;
}

type AttendanceWithUser = Omit<Attendance, 'user'> & {
    user: Pick<User, 'id' | 'name' | 'email'> & {
        division_id?: string;
        divisions?: { name: string };
    };
};

export default function AdminAttendancePage() {
    const router = useRouter();
    const [records, setRecords] = useState<AttendanceWithUser[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [filterDivision, setFilterDivision] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<AttendanceWithUser | null>(null);

    useEffect(() => {
        fetchRecords();
        fetchDivisions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, filterDivision]);

    async function fetchDivisions() {
        try {
            const res = await fetch('/api/admin/divisions');
            if (res.ok) {
                const data = await res.json();
                setDivisions(data.divisions || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function fetchRecords() {
        setLoading(true);
        try {
            let url = `/api/admin/attendance?date=${selectedDate}`;
            if (filterDivision) url += `&division_id=${filterDivision}`;

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

    return (
        <div className="min-h-screen bg-teal-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-teal-100">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/admin')}
                                className="p-2 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6 text-teal-600" />
                            </button>
                            <div className="flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-teal-600" />
                                <h1 className="text-xl font-bold text-teal-900">Riwayat Absensi</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-teal-500" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-3 py-2 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Division Filter */}
                {divisions.length > 0 && (
                    <div className="mb-4 flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={filterDivision}
                            onChange={e => setFilterDivision(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                            <option value="">Semua Divisi</option>
                            {divisions.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center border border-teal-100">
                        <ClipboardList className="w-12 h-12 text-teal-300 mx-auto mb-3" />
                        <p className="text-gray-500">Tidak ada data absensi untuk tanggal ini</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-teal-100">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-teal-50 border-b border-teal-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-teal-900">Nama</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-teal-900 hidden md:table-cell">Divisi</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-teal-900">Tipe</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-teal-900">Waktu</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-teal-900">Detail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-teal-50">
                                    {records.map((record) => (
                                        <tr key={record.id} className="hover:bg-teal-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-teal-900">{record.user?.name}</p>
                                                <p className="text-sm text-gray-500">{record.user?.email}</p>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                {record.user?.divisions?.name ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                                                        <Building2 className="w-3 h-3" />
                                                        {record.user.divisions.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${record.type === 'checkin'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                    {record.type === 'checkin' ? (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    ) : (
                                                        <LogOutIcon className="w-3 h-3" />
                                                    )}
                                                    {record.type === 'checkin' ? 'Check In' : 'Check Out'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-teal-900">{formatTime(record.created_at)}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => setSelectedRecord(record)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Lihat
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-teal-100 sticky top-0 bg-white">
                            <h2 className="text-lg font-bold text-teal-900">Detail Absensi</h2>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="p-2 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Photo */}
                            <div className="rounded-xl overflow-hidden bg-gray-100">
                                {selectedRecord.photo_url ? (
                                    <img
                                        src={selectedRecord.photo_url}
                                        alt="Attendance photo"
                                        className="w-full h-64 object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-64 flex items-center justify-center">
                                        <Image className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedRecord.type === 'checkin' ? 'bg-green-100' : 'bg-indigo-100'
                                        }`}>
                                        {selectedRecord.type === 'checkin' ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <LogOutIcon className="w-5 h-5 text-indigo-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Tipe</p>
                                        <p className="font-medium text-teal-900">
                                            {selectedRecord.type === 'checkin' ? 'Check In' : 'Check Out'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Waktu</p>
                                        <p className="font-medium text-teal-900">
                                            {formatDate(selectedRecord.created_at)} - {formatTime(selectedRecord.created_at)}
                                        </p>
                                    </div>
                                </div>

                                <a
                                    href={getMapLink(selectedRecord.latitude, selectedRecord.longitude)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Lokasi</p>
                                        <p className="font-medium text-blue-600">Buka di Google Maps →</p>
                                    </div>
                                </a>

                                {selectedRecord.device_info && (
                                    <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <Smartphone className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-500">Device</p>
                                            <p className="font-medium text-teal-900 truncate text-sm">
                                                {selectedRecord.device_info}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
