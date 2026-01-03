'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import {
    ArrowLeft,
    FileSpreadsheet,
    Calendar,
    Download,
    Loader2,
    CalendarDays,
    CalendarRange,
    User as UserIcon,
    Clock,
    CalendarOff,
    FileText
} from 'lucide-react';

interface ReportMeta {
    type: string;
    total: number;
    date?: string;
    month?: string;
    user?: string;
    email?: string;
    startDate?: string;
    endDate?: string;
    lateThreshold?: string;
}

const REPORT_TYPES = [
    {
        id: 'daily',
        name: 'Laporan Harian',
        description: 'Absensi semua karyawan pada tanggal tertentu',
        icon: CalendarDays,
        color: 'bg-teal-100 text-teal-700'
    },
    {
        id: 'monthly',
        name: 'Rekap Bulanan',
        description: 'Rangkuman absensi per karyawan selama 1 bulan',
        icon: CalendarRange,
        color: 'bg-indigo-100 text-indigo-700'
    },
    {
        id: 'employee',
        name: 'Laporan Karyawan',
        description: 'Riwayat absensi 1 karyawan dalam rentang waktu',
        icon: UserIcon,
        color: 'bg-blue-100 text-blue-700'
    },
    {
        id: 'late',
        name: 'Laporan Keterlambatan',
        description: 'Daftar karyawan yang terlambat dalam 1 bulan',
        icon: Clock,
        color: 'bg-amber-100 text-amber-700'
    },
    {
        id: 'leaves',
        name: 'Laporan Izin/Cuti',
        description: 'Daftar izin, sakit, cuti, dinas dalam 1 bulan',
        icon: CalendarOff,
        color: 'bg-green-100 text-green-700'
    },
];

export default function AdminReportsPage() {
    const router = useRouter();
    const [selectedType, setSelectedType] = useState('daily');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<{ report: Record<string, unknown>[]; meta: ReportMeta } | null>(null);

    // Filters
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [userId, setUserId] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users?.filter((u: User) => u.role === 'user') || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    const generateReport = async () => {
        setLoading(true);
        setReportData(null);

        try {
            let url = `/api/admin/reports?type=${selectedType}`;

            switch (selectedType) {
                case 'daily':
                    url += `&date=${date}`;
                    break;
                case 'monthly':
                case 'late':
                case 'leaves':
                    url += `&month=${month}`;
                    break;
                case 'employee':
                    url += `&user_id=${userId}&start_date=${startDate}&end_date=${endDate}`;
                    break;
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setReportData(data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        if (!reportData) return;

        const headers = Object.keys(reportData.report[0] || {});
        const csvContent = [
            headers.join(','),
            ...reportData.report.map(row =>
                headers.map(h => {
                    const val = row[h];
                    // Escape commas and quotes
                    if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                        return `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);

        const reportType = REPORT_TYPES.find(t => t.id === selectedType);
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `${reportType?.name.replace(/\s+/g, '_') || 'laporan'}_${timestamp}.csv`;
        link.click();
    };

    const selectedReportType = REPORT_TYPES.find(t => t.id === selectedType);

    return (
        <div className="min-h-screen bg-teal-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-teal-100">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin')}
                        className="p-2 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-teal-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                        <h1 className="text-xl font-bold text-teal-900">Laporan</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {/* Report Type Selection */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {REPORT_TYPES.map((type) => {
                        const IconComponent = type.icon;
                        return (
                            <button
                                key={type.id}
                                onClick={() => { setSelectedType(type.id); setReportData(null); }}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedType === type.id
                                        ? 'border-teal-500 bg-teal-50'
                                        : 'border-gray-200 bg-white hover:border-teal-300'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${type.color}`}>
                                    <IconComponent className="w-5 h-5" />
                                </div>
                                <p className="font-medium text-teal-900 text-sm">{type.name}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-4 border border-teal-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-teal-600" />
                        <h3 className="font-medium text-teal-900">Filter {selectedReportType?.name}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedType === 'daily' && (
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        )}

                        {(selectedType === 'monthly' || selectedType === 'late' || selectedType === 'leaves') && (
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Bulan</label>
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        )}

                        {selectedType === 'employee' && (
                            <>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Karyawan</label>
                                    <select
                                        value={userId}
                                        onChange={(e) => setUserId(e.target.value)}
                                        className="w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="">Pilih karyawan...</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Dari Tanggal</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={generateReport}
                            disabled={loading || (selectedType === 'employee' && !userId)}
                            className="px-6 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4" />
                                    Generate Laporan
                                </>
                            )}
                        </button>

                        {reportData && reportData.report.length > 0 && (
                            <button
                                onClick={downloadCSV}
                                className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download CSV
                            </button>
                        )}
                    </div>
                </div>

                {/* Report Results */}
                {reportData && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-teal-100">
                        <div className="px-4 py-3 border-b border-teal-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                                <h3 className="font-semibold text-teal-900">{selectedReportType?.name}</h3>
                            </div>
                            <span className="text-sm text-gray-500">{reportData.meta.total} data</span>
                        </div>

                        {reportData.report.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <FileSpreadsheet className="w-12 h-12 text-teal-300 mx-auto mb-3" />
                                <p>Tidak ada data untuk filter ini</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-teal-50 border-b border-teal-100">
                                        <tr>
                                            {Object.keys(reportData.report[0]).map((header) => (
                                                <th key={header} className="px-4 py-3 text-left font-medium text-teal-900 whitespace-nowrap">
                                                    {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-teal-50">
                                        {reportData.report.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-teal-50/50">
                                                {Object.values(row).map((val, vIdx) => (
                                                    <td key={vIdx} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                                        {String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
