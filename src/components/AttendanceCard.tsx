import { Attendance } from '@/types';
import { formatDate, formatTime, getMapLink } from '@/lib/utils';

interface AttendanceCardProps {
    attendance: Attendance;
    showPhoto?: boolean;
}

export default function AttendanceCard({ attendance, showPhoto = false }: AttendanceCardProps) {
    const isCheckin = attendance.type === 'checkin';

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${isCheckin
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                        {isCheckin ? 'Check In' : 'Check Out'}
                    </span>
                    <span className="text-sm text-gray-500">
                        {formatTime(attendance.created_at)}
                    </span>
                </div>

                {/* Date */}
                <p className="text-gray-700 font-medium mb-2">
                    {formatDate(attendance.created_at)}
                </p>

                {/* Location */}
                <a
                    href={getMapLink(attendance.latitude, attendance.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Lihat Lokasi
                </a>

                {/* Photo */}
                {showPhoto && attendance.photo_url && (
                    <div className="mt-3">
                        <img
                            src={attendance.photo_url}
                            alt="Attendance photo"
                            className="w-full h-48 object-cover rounded-lg"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
