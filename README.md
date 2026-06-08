# TOYOTA : PAD-CCR Local part ordering

Dashboard operasional untuk proses local part ordering di lingkungan PAD-CCR Toyota. Aplikasi ini dibuat dengan Next.js dan PostgreSQL untuk mendukung alur kerja planning, ordering, delivery, receiving, tracking, dan analysis dalam satu sistem terintegrasi.

## Fitur Utama

- `Planning` untuk mengelola planning harian, stock awal, dan plan produksi.
- `Ordering` untuk membuat order local part dan memantau active order.
- `Delivery` untuk mengonfirmasi quantity yang dikirim.
- `Receiving` untuk mencatat quantity yang diterima dan menyelesaikan order.
- `Tracking` untuk memantau progres order berdasarkan tanggal, shift, dan day/night.
- `Analysis` untuk melihat tren request, delivery, dan performa order dari dashboard analitik.
- `Users` untuk pengelolaan akun dan role akses.
- `Notification` untuk notifikasi status order antar role.
- `Authentication` berbasis credential login dengan `next-auth`.

## Role Akses

Sistem menggunakan role berikut:

- `ADMIN`
- `ORDERING`
- `DELIVERY`
- `RECEIVING`

Beberapa menu hanya tampil sesuai role user yang login.

## Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Prisma`
- `PostgreSQL`
- `NextAuth`
- `Tailwind CSS 4`

## Struktur Modul

Direktori utama yang relevan:

- `app/` halaman dan API route.
- `components/` komponen UI per modul.
- `lib/` helper bisnis dan utilitas aplikasi.
- `prisma/` schema dan migration database.
- `scripts/` utility untuk migrasi dan import data awal.
- `public/` aset gambar dan file statis.

## Persiapan Environment

Buat file `.env` di root project dan isi minimal seperti berikut:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/toyota_ccr_ordering"
AUTH_SECRET="replace-with-random-secret"

# Opsional untuk import data awal
DAILY_PLANNING_CSV_PATH="/absolute/path/Daily_Planning.csv"
ORDER_HEADER_CSV_PATH="/absolute/path/Order_Header.csv"
ORDER_DETAIL_CSV_PATH="/absolute/path/Order_Detail.csv"
```

Catatan:

- `DATABASE_URL` wajib mengarah ke database PostgreSQL yang aktif.
- `AUTH_SECRET` wajib diisi untuk session authentication.
- Jika path CSV tidak diisi, script import akan mencoba membaca file dari folder `Downloads` user lokal.

## Instalasi

Install dependency:

```bash
npm install
```

Jalankan aplikasi development:

```bash
npm run dev
```

Aplikasi akan tersedia di `http://localhost:3000`.

## Setup Database

Project ini menggunakan Prisma migration dan script import data awal.

Untuk menjalankan migration, generate Prisma client, dan import data awal:

```bash
npm run db:init
```

Script tersebut akan:

1. Menjalankan `prisma migrate deploy`
2. Menjalankan `prisma generate`
3. Menjalankan import data ordering dari file CSV

Jika hanya ingin import ulang data CSV:

```bash
npm run db:import-ordering
```

## Data yang Diimpor

Script import membaca 3 file CSV:

- `Daily_Planning.csv`
- `Order_Header.csv`
- `Order_Detail.csv`

Data akan dimasukkan ke tabel:

- `Daily_Planning`
- `Order_Header`
- `Order_Detail`

Saat import berjalan, data planning dan order yang lama akan dihapus lebih dulu sebelum data baru dimasukkan.

## Authentication

Login menggunakan email dan password melalui `Credentials Provider` dari `next-auth`.

Endpoint registrasi tersedia di:

```txt
POST /api/register
```

User baru yang dibuat melalui endpoint ini akan mendapatkan role default:

```txt
ORDERING
```

## Script Penting

- `npm run dev` menjalankan aplikasi dalam mode development.
- `npm run build` build aplikasi production.
- `npm run start` menjalankan hasil build production.
- `npm run lint` menjalankan ESLint.
- `npm run db:init` migrasi database, generate Prisma client, dan import data awal.
- `npm run db:import-ordering` import ulang data planning dan ordering dari CSV.

## Alur Operasional Singkat

1. Input planning harian pada modul `Planning`.
2. Buat order pada modul `Ordering`.
3. Konfirmasi quantity pada modul `Delivery`.
4. Input quantity received pada modul `Receiving`.
5. Pantau progres melalui `Tracking`.
6. Analisis performa melalui `Analysis`.

## Catatan Pengembangan

- Project menggunakan App Router dari Next.js.
- API tersedia di bawah `app/api/`.
- Prisma schema berada di [prisma/schema.prisma](/Users/cal/Documents/Coding/Toyota/Dummy_Next/toyota-dummy/prisma/schema.prisma).
- Sidebar dan visibilitas menu mengikuti role user di [components/Sidebar/Sidebar.tsx](/Users/cal/Documents/Coding/Toyota/Dummy_Next/toyota-dummy/components/Sidebar/Sidebar.tsx).

## Menjalankan Lint

```bash
npm run lint
```

npm run dev
cloudflared tunnel run 3eb31d6c-0159-4b79-af15-dbb39f03abd6

2

cloudflared tunnel --protocol http2 run fastapi-laptop

or
npm run build
npx next start -p 3000