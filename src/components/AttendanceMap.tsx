'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface AttendanceMapProps {
    officeLat: number;
    officeLng: number;
    officeRadius: number;
    userLat: number | null;
    userLng: number | null;
}

export default function AttendanceMap({ officeLat, officeLng, officeRadius, userLat, userLng }: AttendanceMapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const officeCircleRef = useRef<L.Circle | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

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

        const map = L.map(mapContainerRef.current).setView([officeLat, officeLng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add Office Circle
        const circle = L.circle([officeLat, officeLng], {
            radius: officeRadius,
            color: '#10B981', // Emerald-500
            fillColor: '#10B981',
            fillOpacity: 0.15,
            weight: 2,
        }).addTo(map);
        officeCircleRef.current = circle;

        // Add Office Marker (Center)
        L.marker([officeLat, officeLng], {
            interactive: false,
            opacity: 0.5
        }).addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update markers when props change
    useEffect(() => {
        if (!mapRef.current || !officeCircleRef.current) return;

        // Update Office Circle
        officeCircleRef.current.setLatLng([officeLat, officeLng]);
        officeCircleRef.current.setRadius(officeRadius);

        // Handle User Marker
        if (userLat !== null && userLng !== null) {
            if (userMarkerRef.current) {
                userMarkerRef.current.setLatLng([userLat, userLng]);
            } else {
                // Custom Icon for User
                const userIcon = L.divIcon({
                    className: 'custom-user-marker',
                    html: `<div style="
                        background-color: #3B82F6; 
                        width: 16px; 
                        height: 16px; 
                        border-radius: 50%; 
                        border: 3px solid white; 
                        box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });

                userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(mapRef.current);
            }

            // Fit bounds to show both if user is far
            const group = new L.FeatureGroup([
                L.marker([officeLat, officeLng]),
                L.marker([userLat, userLng])
            ]);
            mapRef.current.flyToBounds(group.getBounds(), { padding: [50, 50], maxZoom: 18 });

        } else {
            if (userMarkerRef.current) {
                userMarkerRef.current.remove();
                userMarkerRef.current = null;
            }
        }

    }, [officeLat, officeLng, officeRadius, userLat, userLng]);

    return (
        <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 0 }} />

            {/* Legend Overlay */}
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 shadow-sm border border-gray-100 z-[400] flex gap-3">
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-20 border border-emerald-500"></div>
                    Area Absen
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white shadow-sm"></div>
                    Posisi Anda
                </div>
            </div>
        </div>
    );
}
