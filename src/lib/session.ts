import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SessionUser } from '@/types';

const SECRET_KEY = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'your-secret-key-min-32-characters-long'
);

const SESSION_COOKIE_NAME = 'session';
const SESSION_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

export async function createSession(user: SessionUser): Promise<string> {
    const token = await new SignJWT({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_first_login: user.is_first_login,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(`${SESSION_EXPIRY}s`)
        .sign(SECRET_KEY);

    return token;
}

export async function verifySession(token: string): Promise<SessionUser | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return {
            id: payload.id as string,
            email: payload.email as string,
            name: payload.name as string,
            role: payload.role as 'admin' | 'user',
            is_first_login: payload.is_first_login as boolean,
        };
    } catch {
        return null;
    }
}

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
        return null;
    }

    return verifySession(sessionCookie.value);
}

export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_EXPIRY,
        path: '/',
    });
}

export async function clearSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}
