# Absensi - Attendance Web App

Sistem absensi karyawan dengan foto selfie dan GPS.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Auth**: Session-based (HTTP-only cookies)

## Setup

### 1. Clone & Install

```bash
cd ABSENSI/absensi-app
npm install
```

### 2. Setup Supabase

1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan SQL di `supabase-schema.sql` ke SQL Editor
3. Buat Storage bucket `attendance-photos` (set to PUBLIC)
4. Copy URL dan API keys

### 3. Environment Variables

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
SESSION_SECRET=your-secret-min-32-characters
```

### 4. Create Admin User

Generate password hash:
```bash
node scripts/generate-hash.js admin123
```

Kemudian jalankan SQL di Supabase:
```sql
INSERT INTO users (name, email, password_hash, role, is_first_login, status) VALUES 
('Admin', 'admin@company.com', 'HASH_DARI_SCRIPT', 'admin', true, 'active');
```

### 5. Run Development

```bash
npm run dev
```

Buka http://localhost:3000

## Default Credentials

- **Email**: admin@company.com
- **Password**: admin123

## Features

### User (Karyawan)
- ✅ Login / Logout
- ✅ Ubah password (wajib saat pertama login)
- ✅ Check In dengan selfie + GPS
- ✅ Check Out dengan selfie + GPS
- ✅ Lihat riwayat absensi

### Admin
- ✅ Dashboard overview hari ini
- ✅ Kelola user (tambah, edit, nonaktifkan)
- ✅ Reset password user
- ✅ Lihat semua absensi dengan filter tanggal
- ✅ Detail absensi (foto, lokasi, waktu)

## Office Location (Dummy)

Default location: Jakarta
- Latitude: -6.2088
- Longitude: 106.8456
- Radius: 300 meter

Edit di `src/lib/utils.ts` untuk mengubah lokasi kantor.
