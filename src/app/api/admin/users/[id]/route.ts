import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/adminLog';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Update user (admin only)
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { name, email, role, status, password } = body;

        const supabase = createServerClient();

        // Build update object
        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email.toLowerCase();
        if (role) updateData.role = role;
        if (status) updateData.status = status;

        // If resetting password
        if (password) {
            const saltRounds = 10;
            updateData.password_hash = await bcrypt.hash(password, saltRounds);
            updateData.is_first_login = true;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'Tidak ada data untuk diupdate' },
                { status: 400 }
            );
        }

        const { data: user, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select('id, name, email, role, is_first_login, status, created_at')
            .single();

        if (error) {
            throw error;
        }

        // Log admin action
        if (body.password) {
            await logAdminAction(session.id, session.name, 'user_reset_password', {
                user_name: user.name,
                user_email: user.email,
            });
        } else if (body.status) {
            await logAdminAction(session.id, session.name, 'user_toggle_status', {
                user_name: user.name,
                new_status: user.status,
            });
        } else {
            await logAdminAction(session.id, session.name, 'user_update', {
                user_name: user.name,
                user_email: user.email,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'User berhasil diupdate',
            user,
        });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

// Delete user (admin only) - HARD DELETE (Removes user and cascade deletes related data)
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Prevent admin from deleting themselves
        if (id === session.id) {
            return NextResponse.json(
                { error: 'Tidak dapat menghapus akun sendiri' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        // Log admin action (we need to get user info before delete, so pass id)
        await logAdminAction(session.id, session.name, 'user_delete', {
            deleted_user_id: id,
        });

        return NextResponse.json({
            success: true,
            message: 'User berhasil dihapus permanen',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
