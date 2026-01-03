import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase';
import { getSession, createSession, setSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Password lama dan baru wajib diisi' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Password baru minimal 6 karakter' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Get current user with password
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.id)
            .single();

        if (fetchError || !user) {
            return NextResponse.json(
                { error: 'User tidak ditemukan' },
                { status: 404 }
            );
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Password lama salah' },
                { status: 401 }
            );
        }

        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password and is_first_login
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: newPasswordHash,
                is_first_login: false,
            })
            .eq('id', session.id);

        if (updateError) {
            throw updateError;
        }

        // Create new session with updated is_first_login
        const newToken = await createSession({
            ...session,
            is_first_login: false,
        });
        await setSessionCookie(newToken);

        return NextResponse.json({
            success: true,
            message: 'Password berhasil diubah',
        });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
