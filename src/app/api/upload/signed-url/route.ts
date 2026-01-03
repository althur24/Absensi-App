import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { filename, contentType } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json(
                { error: 'Filename dan contentType wajib diisi' },
                { status: 400 }
            );
        }

        // Validate content type (only images allowed)
        if (!contentType.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Hanya file gambar yang diizinkan' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Generate unique filename
        const timestamp = Date.now();
        const uniqueFilename = `${session.id}/${timestamp}_${filename}`;

        // Create signed upload URL
        const { data, error } = await supabase.storage
            .from('attendance-photos')
            .createSignedUploadUrl(uniqueFilename);

        if (error) {
            throw error;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('attendance-photos')
            .getPublicUrl(uniqueFilename);

        return NextResponse.json({
            signedUrl: data.signedUrl,
            token: data.token,
            path: uniqueFilename,
            publicUrl: publicUrlData.publicUrl,
        });
    } catch (error) {
        console.error('Signed URL error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
