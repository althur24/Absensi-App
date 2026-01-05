import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/adminLog';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Update division
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { name, description } = await request.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Nama divisi wajib diisi' }, { status: 400 });
        }

        const supabase = createServerClient();

        // Check if name already exists (excluding current)
        const { data: existing } = await supabase
            .from('divisions')
            .select('id')
            .ilike('name', name.trim())
            .neq('id', id)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Nama divisi sudah ada' }, { status: 400 });
        }

        const { data: division, error } = await supabase
            .from('divisions')
            .update({
                name: name.trim(),
                description: description?.trim() || null,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await logAdminAction(session.id, session.name, 'user_update', {
            action_type: 'division_update',
            division_name: name,
        });

        return NextResponse.json({
            success: true,
            message: 'Divisi berhasil diupdate',
            division,
        });
    } catch (error) {
        console.error('Update division error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}

// Delete division
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const supabase = createServerClient();

        // Get division name for logging
        const { data: division } = await supabase
            .from('divisions')
            .select('name')
            .eq('id', id)
            .single();

        // Check if any users are using this division
        const { count } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('division_id', id);

        if (count && count > 0) {
            return NextResponse.json({
                error: `Tidak dapat menghapus divisi. Masih ada ${count} user yang terdaftar di divisi ini.`
            }, { status: 400 });
        }

        const { error } = await supabase
            .from('divisions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await logAdminAction(session.id, session.name, 'user_delete', {
            action_type: 'division_delete',
            division_name: division?.name,
        });

        return NextResponse.json({
            success: true,
            message: 'Divisi berhasil dihapus',
        });
    } catch (error) {
        console.error('Delete division error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
