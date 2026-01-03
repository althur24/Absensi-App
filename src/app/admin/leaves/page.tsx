'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, getTodayDate } from '@/lib/utils';
import { User } from '@/types';
import {
    ArrowLeft,
    Calendar,
    Plus,
    X,
    Trash2,
    CalendarOff,
    Briefcase,
    Stethoscope,
    Palmtree,
    Building2,
    Loader2,
    Save
} from 'lucide-react';

interface Leave {
    id: string;
    user_id: string;
    date: string;
    type: 'izin' | 'sakit' | 'cuti' | 'dinas';
    reason: string | null;
    user: {
        id: string;
        name: string;
        email: string;
    };
}

const LEAVE_TYPES = [
    { value: 'izin', label: 'Izin', icon: CalendarOff, color: 'bg-amber-100 text-amber-700' },
    { value: 'sakit', label: 'Sakit', icon: Stethoscope, color: 'bg-red-100 text-red-700' },
    { value: 'cuti', label: 'Cuti', icon: Palmtree, color: 'bg-green-100 text-green-700' },
    { value: 'dinas', label: 'Dinas Luar', icon: Building2, color: 'bg-blue-100 text-blue-700' },
];

export default function AdminLeavesPage() {
    const router = useRouter();
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        user_id: '',
        date: getTodayDate(),
        type: 'izin',
        reason: '',
    });

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate]);

    async function fetchData() {
        setLoading(true);
        try {
            const [leavesRes, usersRes] = await Promise.all([
                fetch(`/api/admin/leaves?date=${selectedDate}`),
                fetch('/api/admin/users'),
            ]);

            if (leavesRes.ok) {
                const data = await leavesRes.json();
                setLeaves(data.leaves || []);
            }

            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.users?.filter((u: User) => u.role === 'user' && u.status === 'active') || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                setShowModal(false);
                setFormData({ user_id: '', date: selectedDate, type: 'izin', reason: '' });
                fetchData();
                setMessage({ type: 'success', text: 'Izin berhasil ditambahkan' });
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch {
            setMessage({ type: 'error', text: 'Terjadi kesalahan' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus izin ini?')) return;

        try {
            const res = await fetch(`/api/admin/leaves?id=${id}`, { method: 'DELETE' });

            if (res.ok) {
                fetchData();
                setMessage({ type: 'success', text: 'Izin berhasil dihapus' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Gagal menghapus izin' });
        }
    };

    const getLeaveTypeInfo = (type: string) => {
        return LEAVE_TYPES.find(t => t.value === type) || LEAVE_TYPES[0];
    };

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
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-teal-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <CalendarOff className="w-5 h-5 text-teal-600" />
                            <h1 className="text-xl font-bold text-teal-900">Kelola Izin</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-teal-500" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500 bg-teal-50"
                        />
                        <button
                            onClick={() => {
                                setFormData({ ...formData, date: selectedDate });
                                setShowModal(true);
                            }}
                            className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 flex items-center gap-2 shadow-lg shadow-teal-500/30"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">Tambah</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Message */}
                {message.text && (
                    <div className={`mb-4 p-4 rounded-xl text-sm border ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Leaves List */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-teal-100">
                    <div className="px-4 py-3 border-b border-teal-100">
                        <h2 className="font-semibold text-teal-900">Izin Tanggal {formatDate(selectedDate)}</h2>
                    </div>
                    <div className="divide-y divide-teal-50">
                        {leaves.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Briefcase className="w-12 h-12 text-teal-300 mx-auto mb-3" />
                                <p>Tidak ada izin untuk tanggal ini</p>
                            </div>
                        ) : (
                            leaves.map((leave) => {
                                const typeInfo = getLeaveTypeInfo(leave.type);
                                const IconComponent = typeInfo.icon;
                                return (
                                    <div key={leave.id} className="px-4 py-3 flex items-center justify-between hover:bg-teal-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-teal-900">{leave.user?.name}</p>
                                                <p className="text-sm text-gray-500">{leave.user?.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                                {leave.reason && (
                                                    <p className="text-xs text-gray-500 mt-1 max-w-[150px] truncate">{leave.reason}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDelete(leave.id)}
                                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-teal-100">
                            <h2 className="text-lg font-bold text-teal-900">Tambah Izin</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-teal-50 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-teal-900 mb-1">Karyawan</label>
                                <select
                                    value={formData.user_id}
                                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500"
                                    required
                                >
                                    <option value="">Pilih karyawan...</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-teal-900 mb-1">Tanggal</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-teal-900 mb-2">Jenis Izin</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {LEAVE_TYPES.map((type) => {
                                        const IconComponent = type.icon;
                                        return (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: type.value })}
                                                className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${formData.type === type.value
                                                        ? 'border-teal-500 bg-teal-50'
                                                        : 'border-gray-200 hover:border-teal-300'
                                                    }`}
                                            >
                                                <IconComponent className={`w-5 h-5 ${formData.type === type.value ? 'text-teal-600' : 'text-gray-500'}`} />
                                                <span className={formData.type === type.value ? 'text-teal-900 font-medium' : 'text-gray-700'}>
                                                    {type.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-teal-900 mb-1">Keterangan (opsional)</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500 resize-none"
                                    rows={2}
                                    placeholder="Alasan izin..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 border border-teal-200 text-teal-700 font-medium rounded-xl hover:bg-teal-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Simpan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
