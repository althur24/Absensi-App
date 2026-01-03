'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import {
    ArrowLeft,
    Users,
    Plus,
    Edit2,
    Key,
    UserX,
    UserCheck,
    X,
    Save,
    Loader2,
    Mail,
    User as UserIcon,
    Shield
} from 'lucide-react';

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const openAddModal = () => {
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'user' });
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, password: '', role: user.role });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            if (editingUser) {
                const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: formData.name, role: formData.role }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error);
                }
            } else {
                const res = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error);
                }
            }

            setShowModal(false);
            fetchUsers();
            setMessage({ type: 'success', text: editingUser ? 'User berhasil diupdate' : 'User berhasil ditambahkan' });
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Terjadi kesalahan' });
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async (userId: string) => {
        const newPassword = prompt('Masukkan password baru:');
        if (!newPassword) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Password berhasil direset' });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error });
            }
        } catch {
            setMessage({ type: 'error', text: 'Gagal reset password' });
        }
    };

    const handleToggleStatus = async (user: User) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';

        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                fetchUsers();
                setMessage({ type: 'success', text: `User ${newStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}` });
            }
        } catch {
            setMessage({ type: 'error', text: 'Gagal mengubah status' });
        }
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
                            <Users className="w-5 h-5 text-teal-600" />
                            <h1 className="text-xl font-bold text-teal-900">Kelola User</h1>
                        </div>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-lg shadow-teal-500/30"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Tambah User</span>
                    </button>
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

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-teal-100">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-teal-50 border-b border-teal-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-teal-900">Nama</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-teal-900 hidden sm:table-cell">Email</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-teal-900">Role</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-teal-900">Status</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-teal-900">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-teal-50">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-teal-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-teal-900">{user.name}</p>
                                                <p className="text-sm text-gray-500 sm:hidden">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin'
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                <Shield className="w-3 h-3" />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${user.status === 'active'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 hover:bg-teal-100 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4 text-teal-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleResetPassword(user.id)}
                                                    className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <Key className="w-4 h-4 text-amber-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(user)}
                                                    className={`p-2 rounded-lg transition-colors ${user.status === 'active'
                                                            ? 'hover:bg-red-100'
                                                            : 'hover:bg-green-100'
                                                        }`}
                                                    title={user.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {user.status === 'active' ? (
                                                        <UserX className="w-4 h-4 text-red-600" />
                                                    ) : (
                                                        <UserCheck className="w-4 h-4 text-green-600" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-teal-100">
                            <h2 className="text-lg font-bold text-teal-900">
                                {editingUser ? 'Edit User' : 'Tambah User'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-teal-900 mb-1">Nama</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            {!editingUser && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-teal-900 mb-1">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-teal-900 mb-1">Password</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-teal-900 mb-1">Role</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 border border-teal-200 text-teal-700 font-medium rounded-xl hover:bg-teal-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
