import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/adminLog';

// Get all divisions
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerClient();

        const { data: divisions, error } = await supabase
            .from('divisions')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            // If table doesn't exist, return empty array
            if (error.code === '42P01') {
                return NextResponse.json({ divisions: [] });
            }
            throw error;
        }

        return NextResponse.json({ divisions: divisions || [] });
    } catch (error) {
        console.error('Get divisions error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}

// Create new division
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description } = await request.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Nama divisi wajib diisi' }, { status: 400 });
        }

        const supabase = createServerClient();

        // Check if name already exists
        const { data: existing } = await supabase
            .from('divisions')
            .select('id')
            .ilike('name', name.trim())
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Nama divisi sudah ada' }, { status: 400 });
        }

        const { data: division, error } = await supabase
            .from('divisions')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
            })
            .select()
            .single();

        if (error) throw error;

        // Log admin action
        await logAdminAction(session.id, session.name, 'division_create', {
            division_name: name,
        });

        return NextResponse.json({
            success: true,
            message: 'Divisi berhasil dibuat',
            division,
        });
    } catch (error) {
        console.error('Create division error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
