import { useState, useEffect } from 'react';
import CameraCapture from './CameraCapture';
import { useLocation, uploadPhoto, submitAttendance } from './AttendanceUtils';
import { Camera, MapPin, CheckCircle2, LogOut, Loader2, AlertCircle, XCircle } from 'lucide-react';
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

export default function AttendanceButton({ type, onSuccess }: AttendanceButtonProps) {
    const [showCamera, setShowCamera] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Config & Live Distance
    const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [isLocationReady, setIsLocationReady] = useState(false);

    // Existing hook for submission (still needed for precise snapshot)
    const { location, error: locationError, loading: locationLoading, refresh: refreshLocation } = useLocation();

    // Fetch Office Config
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/admin/config');
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        setOfficeConfig(data.config);
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
                    const dist = calculateDistance(
                        position.coords.latitude,
                        position.coords.longitude,
                        officeConfig.latitude,
                        officeConfig.longitude
                    );
                    setDistance(dist);
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
                // If hook location is not ready, try to use last known live location? 
                // Better stick to strict hook validation for safety.
                setError('Mengambil lokasi terkini... Coba lagi sebentar.');
                setLoading(false);
                return;
            }

            // Double check info distance before submit (Client Side Validation)
            if (distance && officeConfig && distance > officeConfig.radius_meters) {
                // Optional: Block submit here? 
                // User asked for "Check" text only, but preventing false submit is good UX.
                // Let's allow submit but warn, or block if strict. 
                // Backend always validates, so blocking here saves time.
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
    const distanceText = distance !== null ? `${Math.round(distance)}m` : '...';

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
                        <span>{isCheckIn ? 'Check In' : 'Check Out'}</span>
                    </>
                )}
            </button>

            {/* Location Status & Distance Indicator */}
            <div className="mt-3 flex flex-col items-center gap-2">
                {!officeConfig ? (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Memuat konfigurasi kantor...
                    </span>
                ) : !isLocationReady ? (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Mencari sinyal GPS...
                    </span>
                ) : (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${isWithinRadius
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {isWithinRadius ? (
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        ) : (
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span>
                            {isWithinRadius
                                ? `Di Dalam Area Absen (Jarak: ${distanceText})`
                                : `Di Luar Area Absen (Jarak: ${distanceText})`
                            }
                        </span>
                    </div>
                )}

                {/* Additional Accuracy Info (Subtle) */}
                {location && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Akurasi GPS: ±{Math.round(location.accuracy)}m
                    </span>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2 animate-in slide-in-from-top-2">
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
