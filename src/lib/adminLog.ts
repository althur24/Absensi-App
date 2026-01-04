import { createServerClient } from '@/lib/supabase';

export type AdminAction =
    | 'user_create'
    | 'user_update'
    | 'user_delete'
    | 'user_reset_password'
    | 'user_toggle_status'
    | 'config_update_location'
    | 'config_update_hours'
    | 'leave_approve'
    | 'leave_reject';

interface LogDetails {
    [key: string]: string | number | boolean | null | undefined;
}

export async function logAdminAction(
    adminId: string,
    adminName: string,
    action: AdminAction,
    details?: LogDetails
): Promise<void> {
    try {
        const supabase = createServerClient();

        await supabase.from('admin_logs').insert({
            admin_id: adminId,
            admin_name: adminName,
            action,
            details: details || {},
        });
    } catch (error) {
        // Silently fail - don't break the main action if logging fails
        console.error('[Admin Log Error]', error);
    }
}

// Action descriptions in Indonesian
export const actionLabels: Record<AdminAction, string> = {
    user_create: 'Menambah User Baru',
    user_update: 'Mengubah Data User',
    user_delete: 'Menghapus User',
    user_reset_password: 'Reset Kata Kunci User',
    user_toggle_status: 'Mengubah Status User',
    config_update_location: 'Mengubah Lokasi Kantor',
    config_update_hours: 'Mengubah Jam Kerja',
    leave_approve: 'Menyetujui Izin',
    leave_reject: 'Menolak Izin',
};
