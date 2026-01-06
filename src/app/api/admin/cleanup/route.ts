import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

// DELETE old photos from storage to save space
// Photos older than 30 days will be removed
export async function POST(request: Request) {
    try {
        const session = await getSession();

        // Only allow admin to run cleanup
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { days = 30 } = await request.json().catch(() => ({ days: 30 }));

        const supabase = createServerClient();

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffISO = cutoffDate.toISOString();

        // Get old attendance records with photos
        const { data: oldRecords, error: fetchError } = await supabase
            .from('attendance')
            .select('id, photo_url, created_at')
            .lt('created_at', cutoffISO)
            .not('photo_url', 'is', null);

        if (fetchError) {
            throw fetchError;
        }

        if (!oldRecords || oldRecords.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Tidak ada foto lama yang perlu dihapus',
                deleted: 0,
            });
        }

        // Extract file paths from URLs
        const filePaths: string[] = [];
        for (const record of oldRecords) {
            if (record.photo_url) {
                // Extract path from URL: .../storage/v1/object/public/attendance-photos/filename.jpg
                const match = record.photo_url.match(/attendance-photos\/(.+)$/);
                if (match) {
                    filePaths.push(match[1]);
                }
            }
        }

        let deletedCount = 0;
        let errorCount = 0;

        // Delete files from storage in batches
        if (filePaths.length > 0) {
            const { error: deleteError } = await supabase
                .storage
                .from('attendance-photos')
                .remove(filePaths);

            if (deleteError) {
                console.error('Storage delete error:', deleteError);
                errorCount = filePaths.length;
            } else {
                deletedCount = filePaths.length;
            }
        }

        // Update attendance records to remove photo_url reference
        const oldIds = oldRecords.map(r => r.id);
        const { error: updateError } = await supabase
            .from('attendance')
            .update({ photo_url: null })
            .in('id', oldIds);

        if (updateError) {
            console.error('Update error:', updateError);
        }

        const estimatedSaved = deletedCount * 150; // Estimate 150KB per photo

        return NextResponse.json({
            success: true,
            message: `Cleanup selesai. ${deletedCount} foto dihapus.`,
            deleted: deletedCount,
            errors: errorCount,
            estimated_saved_kb: estimatedSaved,
            estimated_saved_mb: Math.round(estimatedSaved / 1024 * 100) / 100,
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}

// GET - Check storage usage stats
export async function GET() {
    try {
        const session = await getSession();

        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerClient();

        // Count photos by age
        const now = new Date();
        const days30 = new Date(now.setDate(now.getDate() - 30)).toISOString();
        const days60 = new Date(now.setDate(now.getDate() - 30)).toISOString();

        const { count: totalPhotos } = await supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .not('photo_url', 'is', null);

        const { count: old30Days } = await supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .not('photo_url', 'is', null)
            .lt('created_at', days30);

        const { count: old60Days } = await supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .not('photo_url', 'is', null)
            .lt('created_at', days60);

        const estimatedTotalMB = (totalPhotos || 0) * 150 / 1024;
        const estimatedCleanupMB = (old30Days || 0) * 150 / 1024;

        return NextResponse.json({
            total_photos: totalPhotos || 0,
            photos_older_than_30_days: old30Days || 0,
            photos_older_than_60_days: old60Days || 0,
            estimated_total_mb: Math.round(estimatedTotalMB * 100) / 100,
            estimated_cleanup_mb: Math.round(estimatedCleanupMB * 100) / 100,
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
