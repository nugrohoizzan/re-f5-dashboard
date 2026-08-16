# F5 Ops Dashboard

Internal F5 BIG-IP engineer operations dashboard — daily shift schedule,
activities, troubleshooting log, and persistent handover ("Titipan") tasks,
built for the workflow described in the project brief.

**Status: Phase 1–3 complete and verified (builds and type-checks cleanly).**
Phase 4–5 (full audit-log UI, global cross-entity search, advanced
spreadsheet multi-cell copy/paste, PDF export) are noted as **Not yet
implemented** below — the schema and data model already support them, they
just don't have UI yet.

## What's implemented

- **Auth**: NextAuth (credentials/email+password), JWT sessions, middleware
  protecting every route except `/login`. Two roles: `admin`, `engineer`.
- **Engineers**: full CRUD, soft delete (`active` flag) so historical
  records never break.
- **Shift Schedule**: Excel-like grid, click a cell to edit inline, month
  navigation, sticky header/first column, weekend styling, configurable
  color coding per raw value.
- **Business rule engine**: `lib/schedule-rules.ts` resolves "who is
  working Shift 1/2/3 on this date" from the schedule, using rules you
  configure in **Settings** (so `OH`/`CT`/custom values never need a code
  change). Every Activity/Troubleshoot/Titipan form pulls engineers from
  this automatically — nobody types names manually.
- **Dashboard**: date + shift selector, auto-populated engineer badges,
  subtle summary stats, and Troubleshoot / Activity / Titipan tabs.
- **Activities**: fast multi-row batch entry (add several rows, save once),
  inline edit/delete.
- **Troubleshooting**: full field set (title, description, ticket, affected
  VS/pool, resolution, status), add/edit/delete.
- **Titipan (handover tasks)**: persistent across shifts — one row for the
  task's whole life, `source_date`/`source_shift` frozen at creation,
  status filter tabs, detail dialog with **Mark In Progress / Mark
  Completed / Carry Over / Edit / Delete**, and a history timeline table
  (`handover_task_history`) that already logs every action.
- **Handover Report**: generates the structured report (matching the
  format in the brief) from live data, with Copy and Print.
- **Settings**: edit the shift-value → shift-number mapping rules.
- Zod validation on every mutation, toast notifications, confirm dialogs on
  delete, empty states, optimistic schedule-cell updates with rollback on
  failure.

## Not yet implemented (Phase 4–5, roadmap)

- Global cross-entity search bar (per-page search on Activities /
  Troubleshooting / Titipan is done; a single global search box is not).
- A dedicated Audit Log viewer UI (the `audit_log` table is written to on
  every status change already — just no page to browse it yet).
- Multi-cell copy/paste and arrow-key navigation in the schedule grid
  (single-cell click-to-edit works; range operations don't).
- PDF export of the Handover Report (Copy/Print work; Print → Save as PDF
  from the browser is the current path).
- Add/remove arbitrary one-off date columns outside the current month view
  in the schedule grid (month navigation works; you're always viewing a
  full calendar month).

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Drizzle ORM ·
PostgreSQL (Neon) · NextAuth v5 · Zod · Radix UI primitives · Vercel

## Modul MOP (baru)

Menu **MOP** (Metode Operasi Prosedur) menambahkan alur kerja: engineer shift
mengunggah dokumen cara eksekusi (PDF/DOCX, drag-and-drop), otomatis masuk
status **Menunggu Review**, lalu **Team Leader** membuka file langsung di
browser, memberi coretan/markup (pena, teks, kotak, lingkaran, panah), dan
menandai **Selesai Review Internal**.

- **Pencarian** berdasarkan judul atau kode SCR (mis. `SCR26073173374`).
- **Role baru**: `team_leader`, di antara `admin` dan `engineer`. Hanya
  `team_leader`/`admin` yang bisa mengubah status review, menghapus MOP, dan
  menulis Catatan Review. Semua role bisa mengunggah, melihat, download, dan
  mencoret dokumen.
- **Penyimpanan file**: pakai **Vercel Blob** (bukan disk lokal — Vercel
  serverless tidak punya disk persisten). Perlu env var
  `BLOB_READ_WRITE_TOKEN`:
  1. Di dashboard Vercel project kamu → tab **Storage** → **Create Database**
     → pilih **Blob**.
  2. Setelah dibuat, buka tab **.env.local** di halaman Blob store itu, copy
     token `BLOB_READ_WRITE_TOKEN`.
  3. Tempel ke `.env.local` kamu (lokal) — di Vercel production, token ini
     ter-inject otomatis begitu Blob store terhubung ke project.
- **Coretan/markup** disimpan sebagai layer JSON terpisah dari file asli
  (non-destruktif) — digambar ulang di atas preview setiap dibuka. Ini bukan
  per-halaman untuk PDF multi-halaman (mengambang di atas seluruh area
  viewer), dan tombol Download selalu memberi file **asli** tanpa coretan
  ter-flatten — batasan yang disengaja untuk menjaga MVP tetap sederhana dan
  andal.
- **Preview DOCX** memakai Office Online Viewer (butuh file bisa diakses
  publik via URL — otomatis terpenuhi karena Blob diunggah dengan
  `access: "public"`).
- Login demo tambahan: **Team Leader** → `leader@f5ops.local` / `leader123`.

## Migrations

Proyek ini sudah melalui 3 iterasi skema, masing-masing sebagai file migrasi
terpisah di `drizzle/`:
- `0000_...sql` — skema awal (Phase 1-3)
- `0001_...sql` — kolom jam shift (`start_time`/`end_time`) di aturan jadwal
- `0002_...sql` — modul MOP + role `team_leader`

Jalankan `npm run db:migrate` sekali untuk menerapkan ketiganya sekaligus
pada database baru, atau satu per satu kalau melanjutkan dari database yang
sudah ada sebelumnya (Drizzle otomatis melacak migrasi mana yang sudah
jalan).



### 1. Create the database (Neon)

1. Go to [neon.tech](https://neon.tech) and create a free project.
2. Create a database (e.g. `f5ops`).
3. From the Neon dashboard, copy **two** connection strings:
   - The **pooled** connection string → this is your `DATABASE_URL`.
   - The **direct** (unpooled) connection string → this is your
     `DIRECT_URL`, used only for running migrations.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
DATABASE_URL="postgresql://...-pooler..."
DIRECT_URL="postgresql://..."
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run migrations

```bash
npm run db:migrate
```

This applies `drizzle/0000_nappy_randall.sql`, which creates all 9 tables
(users, engineers, shift_schedule, shift_value_rules, activities,
troubleshooting, handover_tasks, handover_task_history, audit_log).

### 5. Seed the database

```bash
npm run db:seed
```

Creates the 10 engineers from the brief, 3 weeks of realistic schedule data,
sample activities/troubleshooting/titipan for 7 Aug 2026, the default shift
value rules, and two login users:

| Role     | Email                 | Password      |
|----------|------------------------|---------------|
| Admin    | admin@f5ops.local      | admin123      |
| Team Leader | leader@f5ops.local  | leader123     |
| Engineer | fahmi@f5ops.local      | engineer123   |

**Change these passwords (or the users) before any real deployment.**

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected
to `/login`.

## Deploying to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, "Add New Project" → import the repo.
3. Under **Environment Variables**, add `DATABASE_URL`, `DIRECT_URL`,
   `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` (set this to your production URL,
   e.g. `https://f5-ops.vercel.app`).
4. Deploy. Vercel will run `next build` automatically.
5. Run migrations against your **production** database once, from your
   local machine (pointing `DIRECT_URL` at production) or via a Vercel
   deploy hook:
   ```bash
   npm run db:migrate
   npm run db:seed   # optional — only if you want the demo data in prod
   ```

## Project structure

```
app/
  (dashboard)/         # authenticated route group: sidebar + topbar shell
    dashboard/
    schedule/
    activities/
    troubleshooting/
    titipan/
    engineers/
    settings/
  login/
  api/auth/[...nextauth]/
components/
  ui/                  # Button, Input, Select, Dialog, Tabs, Badge, Card...
  *-dialogs.tsx         # feature dialogs (add/edit forms)
lib/
  db/                  # schema.ts, index.ts (client), migrate.ts, seed.ts
  auth.ts / auth.config.ts
  schedule-rules.ts    # engineer auto-assignment engine
  validations.ts       # Zod schemas
actions/               # server actions, one file per entity
drizzle/                # generated SQL migrations
```

## Key design decisions (and the assumptions behind them)

- **Titipan is one persistent row, not duplicated per shift.** Carrying a
  task over writes a `handover_task_history` entry instead of creating a
  new record, so the original source date/shift is never lost.
- **Shift-value business rules live in a database table**, not in code,
  because the brief explicitly says not to assume what `OH` means. Add a
  row in Settings and every form immediately understands the new value.
- **Engineer soft-delete only.** Deactivated engineers disappear from "who's
  working today" resolution but stay attached to their historical records.
- **Drizzle over Prisma**: smaller cold-start footprint on Vercel's
  serverless functions, and its query builder maps cleanly onto the
  flexible/ad-hoc filtering this app needs (date+shift+status+search
  combinations).
- I assumed a **single organization-wide `users` table with two roles**
  (admin/engineer) is sufficient rather than fine-grained per-page
  permissions — the brief's Phase 5 hints permissions may expand later, so
  `role` is a plain enum that's easy to extend.
