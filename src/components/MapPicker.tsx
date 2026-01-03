'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
    latitude: number;
    longitude: number;
    radius: number;
    onLocationChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ latitude, longitude, radius, onLocationChange }: MapPickerProps) {
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const circleRef = useRef<L.Circle | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);

    // Fix Leaflet icon issue
    useEffect(() => {
        delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
    }, []);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current).setView([latitude, longitude], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add marker
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onLocationChange(pos.lat, pos.lng);
        });
        markerRef.current = marker;

        // Add circle
        const circle = L.circle([latitude, longitude], {
            radius: radius,
            color: '#4F46E5',
            fillColor: '#4F46E5',
            fillOpacity: 0.2,
            weight: 2,
        }).addTo(map);
        circleRef.current = circle;

        // Click to set location
        map.on('click', (e: L.LeafletMouseEvent) => {
            onLocationChange(e.latlng.lat, e.latlng.lng);
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update marker and circle when props change
    useEffect(() => {
        if (markerRef.current && circleRef.current && mapRef.current) {
            const latLng = L.latLng(latitude, longitude);
            markerRef.current.setLatLng(latLng);
            circleRef.current.setLatLng(latLng);
            circleRef.current.setRadius(radius);
        }
    }, [latitude, longitude, radius]);

    // Search location using Nominatim (OpenStreetMap)
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);

                onLocationChange(newLat, newLng);

                if (mapRef.current) {
                    mapRef.current.setView([newLat, newLng], 16);
                }
            } else {
                alert('Lokasi tidak ditemukan');
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Gagal mencari lokasi');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* Search Bar */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Cari lokasi (contoh: Monas Jakarta)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                />
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {searching ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                    Cari
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (navigator.geolocation) {
                            setSearching(true);
                            navigator.geolocation.getCurrentPosition(
                                (position) => {
                                    const { latitude, longitude } = position.coords;
                                    onLocationChange(latitude, longitude);
                                    if (mapRef.current) {
                                        mapRef.current.setView([latitude, longitude], 18);
                                    }
                                    setSearching(false);
                                },
                                (error) => {
                                    console.error('Error getting location:', error);
                                    alert('Gagal mengambil lokasi saat ini. Pastikan GPS aktif dan izin diberikan.');
                                    setSearching(false);
                                },
                                { enableHighAccuracy: true }
                            );
                        } else {
                            alert('Browser Anda tidak mendukung Geolocation.');
                        }
                    }}
                    disabled={searching}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                    title="Gunakan Lokasi Saat Ini"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crosshair"><circle cx="12" cy="12" r="10" /><line x1="22" x2="18" y1="12" y2="12" /><line x1="6" x2="2" y1="12" y2="12" /><line x1="12" x2="12" y1="6" y2="2" /><line x1="12" x2="12" y1="22" y2="18" /></svg>
                    Lokasi Saya
                </button>
            </div>

            {/* Map */}
            <div
                ref={mapContainerRef}
                className="w-full h-64 rounded-xl overflow-hidden border border-gray-200"
                style={{ zIndex: 0 }}
            />

            {/* Instructions */}
            <p className="text-xs text-gray-500">
                💡 Klik di map atau drag marker untuk mengubah lokasi. Lingkaran menunjukkan radius absensi.
            </p>
        </div>
    );
}
