'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Building2,
    Plus,
    Edit2,
    Trash2,
    X,
    Save,
    Loader2,
    AlertTriangle
} from 'lucide-react';

interface Division {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

export default function DivisionsPage() {
    const router = useRouter();
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingDivision, setEditingDivision] = useState<Division | null>(null);
    const [divisionToDelete, setDivisionToDelete] = useState<Division | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchDivisions();
    }, []);

    async function fetchDivisions() {
        try {
            const res = await fetch('/api/admin/divisions');
            if (res.ok) {
                const data = await res.json();
                setDivisions(data.divisions || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const openAddModal = () => {
        setEditingDivision(null);
        setFormData({ name: '', description: '' });
        setShowModal(true);
    };

    const openEditModal = (division: Division) => {
        setEditingDivision(division);
        setFormData({ name: division.name, description: division.description || '' });
        setShowModal(true);
    };

    const openDeleteModal = (division: Division) => {
        setDivisionToDelete(division);
        setShowDeleteModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const url = editingDivision
                ? `/api/admin/divisions/${editingDivision.id}`
                : '/api/admin/divisions';
            const method = editingDivision ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setShowModal(false);
            fetchDivisions();
            setMessage({
                type: 'success',
                text: editingDivision ? 'Divisi berhasil diupdate' : 'Divisi berhasil ditambahkan'
            });
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Terjadi kesalahan' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!divisionToDelete) return;
        setDeleting(true);

        try {
            const res = await fetch(`/api/admin/divisions/${divisionToDelete.id}`, {
                method: 'DELETE',
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setShowDeleteModal(false);
            setDivisionToDelete(null);
            fetchDivisions();
            setMessage({ type: 'success', text: 'Divisi berhasil dihapus' });
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Terjadi kesalahan' });
            setShowDeleteModal(false);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-teal-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-teal-50">
            <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-teal-100">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin/users')}
                            className="p-2 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-teal-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-teal-600" />
                            <h1 className="text-xl font-bold text-teal-900">Kelola Divisi</h1>
                        </div>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-lg shadow-teal-500/30"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Tambah Divisi</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {message.text && (
                    <div className={`mb-4 p-4 rounded-xl text-sm border ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-teal-100">
                    {divisions.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Building2 className="w-16 h-16 text-teal-200 mx-auto mb-4" />
                            <p className="text-lg font-medium text-teal-900 mb-2">Belum ada divisi</p>
                            <p className="text-sm">Klik tombol &quot;Tambah Divisi&quot; untuk membuat divisi baru</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-teal-50">
                            {divisions.map((division) => (
                                <div key={division.id} className="px-4 py-4 flex items-center justify-between hover:bg-teal-50/50 transition-colors">
                                    <div>
                                        <p className="font-medium text-teal-900">{division.name}</p>
                                        {division.description && (
                                            <p className="text-sm text-gray-500">{division.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditModal(division)}
                                            className="p-2 hover:bg-teal-100 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4 text-teal-600" />
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(division)}
                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold text-teal-900">
                                {editingDivision ? 'Edit Divisi' : 'Tambah Divisi'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Divisi</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="contoh: IT, Marketing, Finance"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (Opsional)</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="Deskripsi singkat divisi"
                                />
                            </div>
                            {message.type === 'error' && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                    {message.text}
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && divisionToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Hapus Divisi?</h2>
                            <p className="text-gray-500 mb-6">
                                Divisi <strong>{divisionToDelete.name}</strong> akan dihapus permanen.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
