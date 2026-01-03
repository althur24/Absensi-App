import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            user: session,
        });
    } catch (error) {
        console.error('Get session error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
