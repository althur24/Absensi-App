'use client';

import { useState } from 'react';
import CameraCapture from './CameraCapture';
import { useLocation, uploadPhoto, submitAttendance } from './AttendanceUtils';
import { Camera, MapPin, CheckCircle2, LogOut, Loader2, AlertCircle } from 'lucide-react';

interface AttendanceButtonProps {
    type: 'checkin' | 'checkout';
    onSuccess: () => void;
}

export default function AttendanceButton({ type, onSuccess }: AttendanceButtonProps) {
    const [showCamera, setShowCamera] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { location, error: locationError, loading: locationLoading, refresh: refreshLocation } = useLocation();

    const handleCapture = async (photoBlob: Blob) => {
        setShowCamera(false);
        setLoading(true);
        setError('');

        try {
            // Trigger refresh location (async via state)
            refreshLocation();

            if (!location) {
                setError('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
                setLoading(false);
                return;
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

    return (
        <>
            <button
                onClick={() => setShowCamera(true)}
                disabled={loading || locationLoading}
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

            {/* Location Status */}
            <div className="flex items-center justify-center gap-2 text-sm mt-2">
                {locationLoading ? (
                    <span className="text-gray-500 flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengambil lokasi...
                    </span>
                ) : locationError ? (
                    <span className="text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {locationError}
                    </span>
                ) : location ? (
                    <span className="text-teal-600 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Lokasi tersedia (±{Math.round(location.accuracy)}m)
                    </span>
                ) : null}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
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
