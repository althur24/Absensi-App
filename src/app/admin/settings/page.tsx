'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Building2, Target, Save, Loader2, Clock, Settings } from 'lucide-react';

const MapPicker = lazy(() => import('@/components/MapPicker'));

interface OfficeConfig {
    latitude: number;
    longitude: number;
    radius_meters: number;
    name: string;
}

interface WorkHoursConfig {
    start_time: string;
    end_time: string;
    late_threshold: string;
}

const RADIUS_PRESETS = [
    { label: '50m', value: 50, description: 'Sangat ketat' },
    { label: '100m', value: 100, description: 'Ketat' },
    { label: '200m', value: 200, description: 'Normal' },
    { label: '300m', value: 300, description: 'Standar' },
    { label: '500m', value: 500, description: 'Longgar' },
    { label: '1km', value: 1000, description: 'Sangat longgar' },
];

export default function AdminSettingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'location' | 'hours'>('location');

    // Office Location State
    const [config, setConfig] = useState<OfficeConfig>({
        latitude: -6.2088,
        longitude: 106.8456,
        radius_meters: 300,
        name: 'Kantor Pusat',
    });

    // Work Hours State
    const [workHours, setWorkHours] = useState<WorkHoursConfig>({
        start_time: '08:00',
        end_time: '17:00',
        late_threshold: '09:00',
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchConfig();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchConfig() {
        try {
            const [configRes, workHoursRes] = await Promise.all([
                fetch('/api/admin/config'),
                fetch('/api/admin/work-hours'),
            ]);

            if (!configRes.ok) {
                router.push('/login');
                return;
            }

            const configData = await configRes.json();
            if (configData.config) {
                setConfig(configData.config);
            }

            if (workHoursRes.ok) {
                const workHoursData = await workHoursRes.json();
                if (workHoursData.config) {
                    setWorkHours(workHoursData.config);
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('✅ Lokasi kantor berhasil disimpan!');
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch {
            setMessage('❌ Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveWorkHours = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const res = await fetch('/api/admin/work-hours', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workHours),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('✅ Jam kerja berhasil disimpan!');
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch {
            setMessage('❌ Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            setMessage('❌ Geolocation tidak didukung');
            return;
        }

        setMessage('⏳ Mengambil lokasi...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setConfig({
                    ...config,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setMessage('📍 Lokasi saat ini berhasil diambil');
            },
            (error) => {
                console.error('Geolocation error:', error);
                setMessage('❌ Gagal mendapatkan lokasi. Pastikan GPS aktif.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleLocationChange = (lat: number, lng: number) => {
        setConfig({ ...config, latitude: lat, longitude: lng });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-teal-50 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-teal-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-teal-100">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin')}
                        className="p-2 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-teal-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-teal-600" />
                        <h1 className="text-xl font-bold text-teal-900">Pengaturan</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 bg-white rounded-xl p-1 border border-teal-100">
                    <button
                        onClick={() => { setActiveTab('location'); setMessage(''); }}
                        className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'location'
                                ? 'bg-teal-600 text-white'
                                : 'text-gray-600 hover:bg-teal-50'
                            }`}
                    >
                        <MapPin className="w-4 h-4" />
                        Lokasi
                    </button>
                    <button
                        onClick={() => { setActiveTab('hours'); setMessage(''); }}
                        className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'hours'
                                ? 'bg-teal-600 text-white'
                                : 'text-gray-600 hover:bg-teal-50'
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        Jam Kerja
                    </button>
                </div>

                {/* Location Tab */}
                {activeTab === 'location' && (
                    <form onSubmit={handleSaveLocation} className="space-y-6">
                        {/* Office Name */}
                        <div className="bg-white rounded-xl shadow-sm p-4 border border-teal-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 className="w-5 h-5 text-teal-600" />
                                <label className="text-sm font-medium text-teal-900">Nama Kantor</label>
                            </div>
                            <input
                                type="text"
                                value={config.name}
                                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                className="w-full px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 placeholder-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="Kantor Pusat"
                            />
                        </div>

                        {/* Map */}
                        <div className="bg-white rounded-xl shadow-sm p-4 border border-teal-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-teal-600" />
                                    <h3 className="font-medium text-teal-900">Lokasi</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGetCurrentLocation}
                                    className="text-sm text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                                >
                                    <Target className="w-4 h-4" />
                                    Lokasi Saya
                                </button>
                            </div>

                            <Suspense fallback={
                                <div className="w-full h-64 bg-teal-50 rounded-xl flex items-center justify-center">
                                    <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
                                </div>
                            }>
                                <MapPicker
                                    latitude={config.latitude}
                                    longitude={config.longitude}
                                    radius={config.radius_meters}
                                    onLocationChange={handleLocationChange}
                                />
                            </Suspense>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={config.latitude.toFixed(6)}
                                        onChange={(e) => setConfig({ ...config, latitude: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 text-sm bg-teal-50 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-teal-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={config.longitude.toFixed(6)}
                                        onChange={(e) => setConfig({ ...config, longitude: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 text-sm bg-teal-50 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-teal-900"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Radius */}
                        <div className="bg-white rounded-xl shadow-sm p-4 border border-teal-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-teal-600" />
                                    <h3 className="font-medium text-teal-900">Radius Absensi</h3>
                                </div>
                                <span className="text-lg font-bold text-teal-600">{config.radius_meters}m</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {RADIUS_PRESETS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        onClick={() => setConfig({ ...config, radius_meters: preset.value })}
                                        className={`p-3 rounded-xl border-2 transition-all text-center ${config.radius_meters === preset.value
                                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                : 'border-gray-200 hover:border-teal-300 text-gray-700'
                                            }`}
                                    >
                                        <div className="font-bold">{preset.label}</div>
                                        <div className="text-xs text-gray-500">{preset.description}</div>
                                    </button>
                                ))}
                            </div>

                            <input
                                type="range"
                                min="50"
                                max="2000"
                                step="50"
                                value={config.radius_meters}
                                onChange={(e) => setConfig({ ...config, radius_meters: parseInt(e.target.value) })}
                                className="w-full h-2 bg-teal-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
                            />
                        </div>

                        {/* Message */}
                        {message && (
                            <div className={`p-4 rounded-xl text-sm ${message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' :
                                    message.startsWith('📍') ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                                        message.startsWith('⏳') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                            'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {message}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Simpan Lokasi
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Work Hours Tab */}
                {activeTab === 'hours' && (
                    <form onSubmit={handleSaveWorkHours} className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm p-4 border border-teal-100 space-y-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-teal-600" />
                                <h3 className="font-medium text-teal-900">Jam Kerja</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-teal-900 mb-2">Jam Masuk</label>
                                    <input
                                        type="time"
                                        value={workHours.start_time}
                                        onChange={(e) => setWorkHours({ ...workHours, start_time: e.target.value })}
                                        className="w-full px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500 text-center text-lg font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-teal-900 mb-2">Jam Pulang</label>
                                    <input
                                        type="time"
                                        value={workHours.end_time}
                                        onChange={(e) => setWorkHours({ ...workHours, end_time: e.target.value })}
                                        className="w-full px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 focus:ring-2 focus:ring-teal-500 text-center text-lg font-bold"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-4 border border-amber-100 space-y-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-600" />
                                <h3 className="font-medium text-teal-900">Batas Terlambat</h3>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-2">
                                    Karyawan dianggap terlambat jika check-in setelah:
                                </label>
                                <input
                                    type="time"
                                    value={workHours.late_threshold}
                                    onChange={(e) => setWorkHours({ ...workHours, late_threshold: e.target.value })}
                                    className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 focus:ring-2 focus:ring-amber-500 text-center text-lg font-bold"
                                    required
                                />
                            </div>
                            <p className="text-sm text-gray-500">
                                Karyawan yang check-in setelah {workHours.late_threshold} akan muncul di daftar "Terlambat" pada dashboard.
                            </p>
                        </div>

                        {/* Message */}
                        {message && (
                            <div className={`p-4 rounded-xl text-sm ${message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' :
                                    'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {message}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Simpan Jam Kerja
                                </>
                            )}
                        </button>
                    </form>
                )}
            </main>
        </div>
    );
}
