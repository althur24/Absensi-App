import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';

// GET - List leaves for a date or user
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const userId = searchParams.get('user_id');
        const divisionId = searchParams.get('division_id');

        const supabase = createServerClient();

        let query = supabase
            .from('leaves')
            .select(`
        *,
        user:users!leaves_user_id_fkey(id, name, email, division_id, divisions(name)),
        created_by_user:users!leaves_created_by_fkey(id, name)
      `)
            .order('date', { ascending: false });

        if (date) {
            query = query.eq('date', date);
        }

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        // Filter by division in memory (since it's a nested relation)
        let filteredData = data;
        if (divisionId && data) {
            filteredData = data.filter(l => l.user?.division_id === divisionId);
        }

        if (error) throw error;

        return NextResponse.json({ leaves: filteredData });
    } catch (error) {
        console.error('Get leaves error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}

// POST - Create leave
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user_id, date, type, reason } = await request.json();

        if (!user_id || !date || !type) {
            return NextResponse.json(
                { error: 'user_id, date, dan type wajib diisi' },
                { status: 400 }
            );
        }

        const validTypes = ['izin', 'sakit', 'cuti', 'dinas'];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: 'Type harus salah satu dari: izin, sakit, cuti, dinas' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('leaves')
            .upsert({
                user_id,
                date,
                type,
                reason: reason || null,
                created_by: session.id,
            }, { onConflict: 'user_id,date' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Izin berhasil ditambahkan',
            leave: data,
        });
    } catch (error) {
        console.error('Create leave error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}

// DELETE - Remove leave
export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });
        }

        const supabase = createServerClient();

        const { error } = await supabase
            .from('leaves')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Izin berhasil dihapus',
        });
    } catch (error) {
        console.error('Delete leave error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
