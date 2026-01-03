# Panduan Deployment ke Railway 🚀

Aplikasi ini siap dideploy ke **Railway** (atau platform lain seperti Vercel). Berikut langkah-langkahnya:

## 1. Persiapan

Pastikan Anda punya akun [Railway](https://railway.app/) dan sudah menginstall **Railway CLI** (opsional, bisa juga via GitHub).

Cara termudah adalah menghubungkan repositori GitHub Anda ke Railway.

## 2. Environment Variables

Saat membuat project baru di Railway, Anda WAJIB menambahkan **Environment Variables** berikut di tab **Variables**. Nilainya bisa dicek di file `.env.local` Anda saat ini.

| Variable Name | Description | Contoh Value |
|Str|Str|Str|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase Anda | `https://xyz...supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Key public/anon Supabase | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Key service role (cek di Supabase > Settings > API) | `eyJ...` (PENTING: Jangan pakai Anon Key disini!) |
| `JWT_SECRET` | Secret random untuk session enkripsi | `random_string_panjang_acak_123` |

> ⚠️ **Catatan:** `SUPABASE_SERVICE_ROLE_KEY` berbeda dengan `ANON_KEY`. Ini dibutuhkan untuk fitur Admin yang perlu bypass RLS atau manage user. Cek di dashboard Supabase bagian **Project Settings > API > service_role (secret)**.

## 3. Langkah Deployment (Via GitHub)

1.  **Push** kode Anda ke GitHub repository.
2.  Buka dashboard **Railway**.
3.  Klik **+ New Project** -> **Deploy from GitHub repo**.
4.  Pilih repo `absensi-app` Anda.
5.  Klik **Add Variables** dan masukkan variabel-variabel di atas.
6.  Railway akan otomatis mendeteksi ini adalah project Next.js dan menjalankan perintah build.
7.  Tunggu proses deploy selesai. Railway akan memberikan domain `xxx.up.railway.app`.

## 4. Langkah Deployment (Via CLI - Tanpa GitHub)

Jika Anda ingin deploy langsung dari terminal tanpa push ke GitHub dulu:

1.  Install Railway CLI: `npm i -g @railway/cli`
2.  Login: `railway login`
3.  Di folder project: `railway init`
4.  `railway link` (pilih project jika sudah ada)
5.  `railway up`
6.  Set variabel environment lewat dashboard Railway atau CLI: `railway variables --set KEY=VALUE`

## 5. Konfigurasi Setelah Deploy

Setelah aplikasi live:

1.  Buka URL aplikasi Anda.
2.  Login sebagai admin.
3.  Masuk ke **Pengaturan**.
4.  Klik tombol **"Lokasi Saya"** (pastikan Anda di kantor) atau set manual Latitude/Longitude kantor.
5.  Simpan lokasi.
6.  Set **Jam Kerja** sesuai kebutuhan.

Selesai! Aplikasi Absensi Anda sudah online! 🌍
