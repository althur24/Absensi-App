'use client';

import { useRef, useState, useEffect } from 'react';
import { X, Camera, SwitchCamera, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (blob: Blob) => void;
    onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        startCamera();
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    const startCamera = async () => {
        setLoading(true);
        setError('');

        try {
            stopCamera();

            // Check if HTTPS (or localhost)
            if (typeof window !== 'undefined' && location.protocol !== 'https:' && location.hostname !== 'localhost') {
                throw new Error('Kamera hanya berjalan di HTTPS.');
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    // Relaxed constraints for better mobile compatibility
                },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                // Explicit play attempt for some browsers
                videoRef.current.play().catch(e => console.warn("Auto-play failed:", e));
                setStream(mediaStream);
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError(err instanceof Error ? err.message : 'Gagal mengakses kamera. Pastikan izin diberikan.');
        } finally {
            setLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
                // Ensure track is really stopped
                track.enabled = false;
            });
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Mirror for front camera
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0);

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    stopCamera(); // Stop camera immediately after capture
                    onCapture(blob);
                }
            },
            'image/jpeg',
            0.8
        );
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
                <button
                    onClick={() => {
                        stopCamera();
                        onClose();
                    }}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                    <X className="w-6 h-6 text-white" />
                </button>
                <span className="text-white font-medium">Ambil Foto Selfie</span>
                <button
                    onClick={toggleCamera}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                    <SwitchCamera className="w-6 h-6 text-white" />
                </button>
            </div>

            {/* Video Preview Container */}
            <div className="flex-1 flex items-center justify-center bg-black relative">
                {loading ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                        <span className="text-white">Memuat kamera...</span>
                    </div>
                ) : error ? (
                    <div className="text-center p-6">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={startCamera}
                            className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
                        >
                            Coba Lagi
                        </button>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={() => {
                            if (videoRef.current) {
                                videoRef.current.play().catch(e => console.error("Play error:", e));
                            }
                        }}
                        className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                )}
            </div>

            {/* Capture Button */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex justify-center">
                    <button
                        onClick={handleCapture}
                        disabled={loading || !!error}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                    >
                        <Camera className="w-8 h-8 text-teal-600" />
                    </button>
                </div>
                <p className="text-center text-white/70 text-sm mt-4">
                    Tekan tombol untuk mengambil foto
                </p>
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
