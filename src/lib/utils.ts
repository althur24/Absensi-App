import { OfficeLocation } from '@/types';

// Default office location (Jakarta - dummy)
export const OFFICE_LOCATION: OfficeLocation = {
    latitude: -6.2088,
    longitude: 106.8456,
    radius_meters: 300,
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in meters
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Check if location is within allowed radius
 */
export function isWithinOfficeRadius(
    latitude: number,
    longitude: number,
    office: OfficeLocation = OFFICE_LOCATION
): boolean {
    const distance = calculateDistance(
        latitude,
        longitude,
        office.latitude,
        office.longitude
    );
    return distance <= office.radius_meters;
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Format time to Indonesian locale
 */
export function formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

/**
 * Format datetime to Indonesian locale
 */
export function formatDateTime(date: string | Date): string {
    return `${formatDate(date)}, ${formatTime(date)}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

/**
 * Get device info from user agent
 */
export function getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'Unknown';
    return navigator.userAgent;
}

/**
 * Generate Google Maps link from coordinates
 */
export function getMapLink(latitude: number, longitude: number): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
