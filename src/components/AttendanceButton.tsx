import { useState, useEffect } from 'react';
import CameraCapture from './CameraCapture';
import { useLocation, uploadPhoto, submitAttendance } from './AttendanceUtils';
import { Camera, MapPin, CheckCircle2, LogOut, Loader2, AlertCircle, XCircle, MapPinCheck, MapPinX } from 'lucide-react';
import { calculateDistance } from '@/lib/utils';

interface AttendanceButtonProps {
    type: 'checkin' | 'checkout';
    onSuccess: () => void;
}

interface OfficeConfig {
    latitude: number;
    longitude: number;
    radius_meters: number;
    name: string;
}

import dynamic from 'next/dynamic';

const AttendanceMap = dynamic(() => import('./AttendanceMap'), { ssr: false, loading: () => <div className="w-full h-48 bg-gray-100 rounded-2xl animate-pulse" /> });

export default function AttendanceButton({ type, onSuccess }: AttendanceButtonProps) {
    const [showCamera, setShowCamera] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Config & Live Distance
    const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [isLocationReady, setIsLocationReady] = useState(false);

    // Live Position for Map
    const [livePos, setLivePos] = useState<{ lat: number; lng: number } | null>(null);

    // Existing hook for submission (still needed for precise snapshot)
    const { location, error: locationError, loading: locationLoading, refresh: refreshLocation } = useLocation();

    // Fetch Office Config
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/admin/config');
                if (res.ok) {
                    const data = await res.json();
                    if (data.location) {
                        setOfficeConfig(data.location);
                    } else if (data.config) {
                        setOfficeConfig(data.config); // Fallback
                    }
                }
            } catch (err) {
                console.error('Failed to fetch office config', err);
            }
        };
        fetchConfig();
    }, []);

    // Real-time Location Tracking
    useEffect(() => {
        if (!officeConfig) return;

        let watchId: number;

        if ('geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const dist = calculateDistance(
                        latitude,
                        longitude,
                        officeConfig.latitude,
                        officeConfig.longitude
                    );
                    setDistance(dist);
                    setLivePos({ lat: latitude, lng: longitude }); // Update Live Pos
                    setIsLocationReady(true);
                },
                (err) => {
                    console.error('Watch Position Error:', err);
                    setIsLocationReady(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [officeConfig]);

    const handleCapture = async (photoBlob: Blob) => {
        setShowCamera(false);
        setLoading(true);
        setError('');

        try {
            // Trigger refresh location (ensure fresh fix)
            refreshLocation();

            if (!location) {
                setError('Mengambil lokasi terkini... Coba lagi sebentar.');
                setLoading(false);
                return;
            }

            // Client Side Validation
            if (distance && officeConfig && distance > officeConfig.radius_meters) {
                throw new Error(`Anda berada di luar jangkauan (${Math.round(distance)}m). Maks: ${officeConfig.radius_meters}m`);
            }

            // Upload photo
            const photoUrl = await uploadPhoto(photoBlob);

            // Submit attendance
            await submitAttendance(type, photoUrl, location.latitude, location.longitude);

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };

    const isCheckIn = type === 'checkin';
    const Icon = isCheckIn ? CheckCircle2 : LogOut;

    // Status Logic
    const isWithinRadius = distance !== null && officeConfig ? distance <= officeConfig.radius_meters : false;

    return (
        <>
            <button
                onClick={() => setShowCamera(true)}
                disabled={loading || !isLocationReady}
                className={`w-full py-5 rounded-2xl font-semibold text-white flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50 ${isCheckIn
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-500/30'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-indigo-500/30'
                    }`}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Memproses...</span>
                    </>
                ) : (
                    <>
                        <Icon className="w-6 h-6" />
                        <span>{isCheckIn ? 'Absen Masuk' : 'Absen Pulang'}</span>
                    </>
                )}
            </button>

            {/* Location Status */}
            <div className="mt-4 flex flex-col items-center gap-2">
                {!officeConfig ? (
                    <span className="text-sm text-gray-500 flex items-center gap-1.5 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Memuat konfigurasi kantor...
                    </span>
                ) : !isLocationReady ? (
                    <span className="text-sm text-gray-500 flex items-center gap-1.5 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Mencari sinyal GPS...
                    </span>
                ) : (
                    <div className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold border shadow-sm transition-all duration-300 ${isWithinRadius
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100'
                        }`}>
                        {isWithinRadius ? (
                            <MapPinCheck className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                        ) : (
                            <MapPinX className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                        )}
                        <span className="tracking-wide">
                            {isWithinRadius
                                ? `Dalam Area (±${Math.round(distance || 0)}m)`
                                : `Luar Jangkauan (±${Math.round(distance || 0)}m)`
                            }
                        </span>
                    </div>
                )}
            </div>

            {/* ERROR Message */}
            {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2 animate-in slide-in-from-top-2 mx-auto max-w-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}



            {/* Camera Modal */}
            {showCamera && (
                <CameraCapture
                    onCapture={handleCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </>
    );
}
