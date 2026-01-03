'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Lock, Eye, EyeOff, Save, Loader2, ShieldCheck } from 'lucide-react';

// Extracted Component
const PasswordInput = ({
    id,
    label,
    value,
    onChange,
    showKey,
    showPasswords,
    setShowPasswords,
    placeholder,
    icon: Icon,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    showKey: 'current' | 'new' | 'confirm';
    showPasswords: any;
    setShowPasswords: any;
    placeholder: string;
    icon: any;
}) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-teal-900 mb-2">
            {label}
        </label>
        <div className="relative">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
            <input
                id={id}
                type={showPasswords[showKey] ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
                minLength={showKey !== 'current' ? 6 : undefined}
                className="w-full pl-12 pr-12 py-3.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 placeholder-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, [showKey]: !showPasswords[showKey] })}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-400 hover:text-teal-600"
            >
                {showPasswords[showKey] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
        </div>
    </div>
);

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Password baru tidak cocok');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password minimal 6 karakter');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Gagal mengubah password');
                return;
            }

            const meRes = await fetch('/api/auth/me');
            const meData = await meRes.json();

            if (meData.user?.role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/dashboard');
            }
        } catch {
            setError('Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-teal-600 via-emerald-500 to-green-500 flex flex-col items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />

            <div className="w-full max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
                        <ShieldCheck className="w-10 h-10 text-white" strokeWidth={2} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Ubah Password</h1>
                    <p className="text-teal-100">Amankan akun Anda dengan password baru</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                {error}
                            </div>
                        )}

                        <PasswordInput
                            id="currentPassword"
                            label="Password Saat Ini"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            showKey="current"
                            showPasswords={showPasswords}
                            setShowPasswords={setShowPasswords}
                            placeholder="Masukkan password lama"
                            icon={Lock}
                        />

                        <PasswordInput
                            id="newPassword"
                            label="Password Baru"
                            value={newPassword}
                            onChange={setNewPassword}
                            showKey="new"
                            showPasswords={showPasswords}
                            setShowPasswords={setShowPasswords}
                            placeholder="Minimal 6 karakter"
                            icon={Key}
                        />

                        <PasswordInput
                            id="confirmPassword"
                            label="Konfirmasi Password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            showKey="confirm"
                            showPasswords={showPasswords}
                            setShowPasswords={setShowPasswords}
                            placeholder="Ketik ulang password baru"
                            icon={Key}
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-emerald-600 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Simpan Password
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}


