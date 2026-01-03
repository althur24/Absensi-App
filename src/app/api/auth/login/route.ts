import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase';
import { createSession, setSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email dan password wajib diisi' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Get user by email
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('status', 'active')
            .single();

        if (error || !user) {
            return NextResponse.json(
                { error: 'Email atau password salah' },
                { status: 401 }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Email atau password salah' },
                { status: 401 }
            );
        }

        // Create session
        const token = await createSession({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            is_first_login: user.is_first_login,
        });

        await setSessionCookie(token);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                is_first_login: user.is_first_login,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
