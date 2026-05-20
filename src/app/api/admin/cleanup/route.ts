import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

// DELETE old photos from storage to save space
// Photos older than specified days will be removed
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

        // Get old attendance records with photos (exclude empty strings and nulls)
        const { data: oldRecords, error: fetchError } = await supabase
            .from('attendance')
            .select('id, photo_url, created_at')
            .lt('created_at', cutoffISO)
            .not('photo_url', 'is', null)
            .neq('photo_url', '');

        if (fetchError) {
            throw fetchError;
        }

        if (!oldRecords || oldRecords.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Tidak ada foto lama yang perlu dihapus',
                deleted: 0,
                failed: 0,
                skipped: 0,
            });
        }

        // Build a map: filePath -> record IDs (for tracking which records to update)
        const fileToRecords = new Map<string, string[]>();
        const skippedRecordIds: string[] = [];

        for (const record of oldRecords) {
            if (record.photo_url) {
                // Extract path from URL: .../storage/v1/object/public/attendance-photos/filename.jpg
                const match = record.photo_url.match(/attendance-photos\/(.+?)(\?.*)?$/);
                if (match) {
                    const filePath = match[1];
                    const existing = fileToRecords.get(filePath) || [];
                    existing.push(record.id);
                    fileToRecords.set(filePath, existing);
                } else {
                    // URL format doesn't match — skip but still mark for cleanup
                    skippedRecordIds.push(record.id);
                }
            } else {
                // photo_url is empty string (from admin-assisted attendance)
                skippedRecordIds.push(record.id);
            }
        }

        const allFilePaths = Array.from(fileToRecords.keys());
        let deletedCount = 0;
        let failedCount = 0;
        const successfulRecordIds: string[] = [];

        // Delete files from storage in batches of 50
        const BATCH_SIZE = 50;
        for (let i = 0; i < allFilePaths.length; i += BATCH_SIZE) {
            const batch = allFilePaths.slice(i, i + BATCH_SIZE);

            const { error: deleteError } = await supabase
                .storage
                .from('attendance-photos')
                .remove(batch);

            if (deleteError) {
                console.error(`Storage delete error (batch ${i / BATCH_SIZE + 1}):`, deleteError);
                failedCount += batch.length;
            } else {
                deletedCount += batch.length;
                // Collect record IDs for successfully deleted files
                for (const filePath of batch) {
                    const recordIds = fileToRecords.get(filePath) || [];
                    successfulRecordIds.push(...recordIds);
                }
            }
        }

        // Clear photo_url for records whose files were successfully deleted
        // Use empty string instead of null (photo_url has NOT NULL constraint)
        if (successfulRecordIds.length > 0) {
            for (let i = 0; i < successfulRecordIds.length; i += 100) {
                const batch = successfulRecordIds.slice(i, i + 100);
                const { error: updateError } = await supabase
                    .from('attendance')
                    .update({ photo_url: '' })
                    .in('id', batch);

                if (updateError) {
                    console.error(`Update error (batch ${i / 100 + 1}):`, updateError);
                }
            }
        }

        const estimatedSaved = deletedCount * 150; // Estimate 150KB per photo

        return NextResponse.json({
            success: true,
            message: `Cleanup selesai. ${deletedCount} foto dihapus.${failedCount > 0 ? ` ${failedCount} gagal.` : ''}`,
            deleted: deletedCount,
            failed: failedCount,
            skipped: skippedRecordIds.length,
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

        // Count photos by age — use separate Date objects to avoid mutation bugs
        const now = new Date();

        const d30 = new Date(now);
        d30.setDate(d30.getDate() - 30);
        const days30 = d30.toISOString();

        const d60 = new Date(now);
        d60.setDate(d60.getDate() - 60);
        const days60 = d60.toISOString();

        const { count: totalPhotos } = await supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .not('photo_url', 'is', null)
            .neq('photo_url', '');

        const { count: old30Days } = await supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .not('photo_url', 'is', null)
            .neq('photo_url', '')
            .lt('created_at', days30);

        const { count: old60Days } = await supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .not('photo_url', 'is', null)
            .neq('photo_url', '')
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
