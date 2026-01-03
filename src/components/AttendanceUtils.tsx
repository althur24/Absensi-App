'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDeviceInfo } from '@/lib/utils';

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
}

interface UseLocationResult {
    location: LocationData | null;
    error: string | null;
    loading: boolean;
    refresh: () => void;
}

export function useLocation(): UseLocationResult {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const getLocation = useCallback(() => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocation tidak didukung oleh browser Anda');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
                setLoading(false);
            },
            (err) => {
                let message = 'Tidak dapat mendapatkan lokasi';
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        message = 'Izin lokasi ditolak. Silakan izinkan akses lokasi.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        message = 'Lokasi tidak tersedia';
                        break;
                    case err.TIMEOUT:
                        message = 'Timeout mendapatkan lokasi';
                        break;
                }
                setError(message);
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    useEffect(() => {
        getLocation();
    }, [getLocation]);

    return {
        location,
        error,
        loading,
        refresh: getLocation,
    };
}

// Upload photo to Supabase via signed URL
export async function uploadPhoto(blob: Blob): Promise<string> {
    // Get signed URL
    const signedUrlResponse = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: `selfie_${Date.now()}.jpg`,
            contentType: 'image/jpeg',
        }),
    });

    if (!signedUrlResponse.ok) {
        throw new Error('Gagal mendapatkan upload URL');
    }

    const { signedUrl, publicUrl } = await signedUrlResponse.json();

    // Upload to Supabase Storage
    const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
    });

    if (!uploadResponse.ok) {
        throw new Error('Gagal mengupload foto');
    }

    return publicUrl;
}

// Submit attendance (check-in or check-out)
export async function submitAttendance(
    type: 'checkin' | 'checkout',
    photoUrl: string,
    latitude: number,
    longitude: number
): Promise<void> {
    const deviceInfo = getDeviceInfo();

    const response = await fetch(`/api/attendance/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            photo_url: photoUrl,
            latitude,
            longitude,
            device_info: deviceInfo,
        }),
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal menyimpan absensi');
    }
}
