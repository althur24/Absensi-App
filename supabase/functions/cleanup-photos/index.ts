// Supabase Edge Function untuk auto-cleanup foto lama
// Deploy ke Supabase dengan: supabase functions deploy cleanup-photos
// Schedule dengan: supabase functions deploy cleanup-photos --schedule "0 0 * * 0"
// (Setiap Minggu jam 00:00 UTC)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DAYS_TO_KEEP = 30

Deno.serve(async () => {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Calculate cutoff date
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP)
        const cutoffISO = cutoffDate.toISOString()

        console.log(`Cleaning up photos older than ${cutoffISO}`)

        // Get old attendance records with photos
        const { data: oldRecords, error: fetchError } = await supabase
            .from('attendance')
            .select('id, photo_url, created_at')
            .lt('created_at', cutoffISO)
            .not('photo_url', 'is', null)

        if (fetchError) {
            throw fetchError
        }

        if (!oldRecords || oldRecords.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No old photos to cleanup', deleted: 0 }),
                { headers: { 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Found ${oldRecords.length} photos to delete`)

        // Extract file paths from URLs
        const filePaths: string[] = []
        for (const record of oldRecords) {
            if (record.photo_url) {
                const match = record.photo_url.match(/attendance-photos\/(.+)$/)
                if (match) {
                    filePaths.push(match[1])
                }
            }
        }

        // Delete files from storage
        let deletedCount = 0
        if (filePaths.length > 0) {
            const { error: deleteError } = await supabase
                .storage
                .from('attendance-photos')
                .remove(filePaths)

            if (deleteError) {
                console.error('Storage delete error:', deleteError)
            } else {
                deletedCount = filePaths.length
            }
        }

        // Update attendance records to remove photo_url reference
        const oldIds = oldRecords.map(r => r.id)
        await supabase
            .from('attendance')
            .update({ photo_url: null })
            .in('id', oldIds)

        console.log(`Cleanup complete. Deleted ${deletedCount} photos.`)

        return new Response(
            JSON.stringify({
                success: true,
                message: `Cleanup complete. Deleted ${deletedCount} photos.`,
                deleted: deletedCount,
            }),
            { headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Cleanup error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
