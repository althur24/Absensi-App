export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    is_first_login: boolean;
    status: 'active' | 'inactive';
    created_at: string;
}

export interface Attendance {
    id: string;
    user_id: string;
    type: 'checkin' | 'checkout';
    photo_url: string;
    latitude: number;
    longitude: number;
    address: string | null;
    device_info: string | null;
    created_at: string;
    user?: User;
}

export interface AttendanceInput {
    type: 'checkin' | 'checkout';
    photo_url: string;
    latitude: number;
    longitude: number;
    address?: string;
    device_info?: string;
}

export interface OfficeLocation {
    latitude: number;
    longitude: number;
    radius_meters: number;
}

export interface SessionUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    is_first_login: boolean;
}
