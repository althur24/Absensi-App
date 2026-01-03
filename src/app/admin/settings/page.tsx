'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Save, MapPin, Clock, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false, loading: () => <div className="w-full h-64 bg-gray-100 rounded-xl animate-pulse" /> });

interface LocationConfig {
    latitude: number;
    longitude: number;
    radius_meters: number;
    name: string;
}

interface WorkHoursConfig {
    start_time: string;
    end_time: string;
    late_threshold: string;
    checkin_start: string;
    checkin_end: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<'location' | 'hours' | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [locationConfig, setLocationConfig] = useState<LocationConfig>({
        latitude: -6.2,
        longitude: 106.8,
        radius_meters: 100,
        name: '',
    });

    const [workHoursConfig, setWorkHoursConfig] = useState<WorkHoursConfig>({
        start_time: '08:00',
        end_time: '17:00',
        late_threshold: '09:00',
        checkin_start: '06:00',
        checkin_end: '12:00',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/admin/config');
                if (res.ok) {
                    const data = await res.json();
                    if (data.location) setLocationConfig(data.location);
                    if (data.workHours) setWorkHoursConfig(data.workHours);
                } else if (res.status === 401) {
                    router.push('/login');
                }
            } catch (error) {
                console.error('Error fetching config:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    const handleSaveLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving('location');
        setMessage(null);

        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'location', ...locationConfig }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Lokasi kantor berhasil disimpan!' });
            } else {
                throw new Error(data.error || 'Gagal menyimpan');
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Terjadi kesalahan' });
        } finally {
            setSaving(null);
        }
    };

    const handleSaveHours = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving('hours');
        setMessage(null);

        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'work_hours', ...workHoursConfig }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Pengaturan jam kerja berhasil disimpan!' });
            } else {
                throw new Error(data.error || 'Gagal menyimpan');
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Terjadi kesalahan' });
        } finally {
            setSaving(null);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
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
            <header className="bg-gradient-to-r from-teal-600 to-teal-500 text-white sticky top-0 z-10 shadow-md">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/admin')}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold">Pengaturan</h1>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full hover:bg-white/20 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {message && (
                    <div className={`p-4 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <p className="font-medium">{message.text}</p>
                    </div>
                )}

                {/* Work Hours Config */}
                <section className="bg-white rounded-2xl shadow-sm border border-teal-100 overflow-hidden">
                    <div className="px-6 py-4 bg-teal-50/50 border-b border-teal-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-teal-600" />
                            <h2 className="font-semibold text-gray-900">Jam Kerja & Absensi</h2>
                        </div>
                    </div>

                    <form onSubmit={handleSaveHours} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900 border-b pb-2">Jam Operasional</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jam Masuk (Start)</label>
                                    <input
                                        type="time"
                                        value={workHoursConfig.start_time}
                                        onChange={e => setWorkHoursConfig({ ...workHoursConfig, start_time: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jam Pulang (End)</label>
                                    <input
                                        type="time"
                                        value={workHoursConfig.end_time}
                                        onChange={e => setWorkHoursConfig({ ...workHoursConfig, end_time: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900 border-b pb-2">Aturan Absensi</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Batas Terlambat</label>
                                    <input
                                        type="time"
                                        value={workHoursConfig.late_threshold}
                                        onChange={e => setWorkHoursConfig({ ...workHoursConfig, late_threshold: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none border-amber-200 bg-amber-50"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Lewat jam ini dianggap terlambat.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Buka Absen</label>
                                        <input
                                            type="time"
                                            value={workHoursConfig.checkin_start}
                                            onChange={e => setWorkHoursConfig({ ...workHoursConfig, checkin_start: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tutup Absen</label>
                                        <input
                                            type="time"
                                            value={workHoursConfig.checkin_end}
                                            onChange={e => setWorkHoursConfig({ ...workHoursConfig, checkin_end: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">Karyawan hanya bisa Check-In di antara jam Buka dan Tutup.</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={saving === 'hours'}
                                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
                            >
                                {saving === 'hours' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Simpan Jam Kerja
                            </button>
                        </div>
                    </form>
                </section>

                {/* Location Config */}
                <section className="bg-white rounded-2xl shadow-sm border border-teal-100 overflow-hidden">
                    <div className="px-6 py-4 bg-teal-50/50 border-b border-teal-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-teal-600" />
                            <h2 className="font-semibold text-gray-900">Lokasi Kantor</h2>
                        </div>
                    </div>

                    <form onSubmit={handleSaveLocation} className="p-6 space-y-6">

                        {/* MAP PICKER INTEGRATION */}
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Lokasi di Peta</label>
                            <MapPicker
                                latitude={locationConfig.latitude}
                                longitude={locationConfig.longitude}
                                radius={Math.max(1, locationConfig.radius_meters || 1)}
                                onLocationChange={(lat, lng) => setLocationConfig(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lokasi</label>
                                <input
                                    type="text"
                                    value={locationConfig.name}
                                    onChange={e => setLocationConfig({ ...locationConfig, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="Contoh: Kantor Pusat"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Radius Absen (Meter)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={locationConfig.radius_meters || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        // Prevent NaN by defaulting to 0 if empty
                                        const numVal = val === '' ? 0 : parseInt(val);
                                        setLocationConfig({ ...locationConfig, radius_meters: isNaN(numVal) ? 0 : numVal });
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={locationConfig.latitude}
                                    onChange={e => setLocationConfig({ ...locationConfig, latitude: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={locationConfig.longitude}
                                    onChange={e => setLocationConfig({ ...locationConfig, longitude: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm bg-gray-50"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={saving === 'location'}
                                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
                            >
                                {saving === 'location' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Simpan Lokasi
                            </button>
                        </div>
                    </form>
                </section>

            </main>
        </div>
    );
}
