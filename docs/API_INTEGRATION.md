# API Integrasi Eksternal — RE-F5 Dashboard

Dokumen ini menjelaskan cara sistem LUAR (bot WA, bot laporan ke atasan,
Google Sheets "manage service", dsb) mengambil data dari dashboard ini
lewat REST API read-only di `/api/v1/*`.

---

## 1. Autentikasi

Semua endpoint di bawah `/api/v1/` butuh **API key**, dikirim lewat header:

```
Authorization: Bearer <API_KEY>
```

Tidak pakai session/cookie login biasa — API key ini terpisah dan dibuat
khusus per integrasi, supaya:
- Satu integrasi bisa dicabut aksesnya tanpa ganggu integrasi lain.
- Ketahuan integrasi mana yang terakhir kali akses data (`lastUsedAt`).

### Cara generate API key baru

Dari terminal (lokal, dengan `.env.local` yang nunjuk ke database
production), jalankan:

```bash
npm run db:api-key -- "Bot WA - HO Report"
```

Ganti teks di dalam kutip dengan nama integrasinya (bebas, cuma buat
identifikasi). Output-nya bakal nunjukin token asli **cuma sekali**:

```
✓ API key berhasil dibuat untuk: Bot WA - HO Report

  Token (SIMPAN SEKARANG, cuma muncul sekali):

  f5ops_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  Cara pakai di sisi tim yang integrasi — header request:
  Authorization: Bearer f5ops_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Token ini **tidak bisa dilihat ulang** — yang tersimpan di database cuma
hash-nya (sama seperti password). Kalau hilang, generate baru aja (key
lama tetap aktif kecuali dicabut manual).

Buat integrasi lain (bot laporan, Google Sheets), jalankan lagi dengan
label yang beda — jadi tiap integrasi punya key sendiri-sendiri:

```bash
npm run db:api-key -- "Bot Laporan Atasan"
npm run db:api-key -- "Google Sheets Manage Service"
```

### Mencabut/menonaktifkan key

Belum ada UI untuk ini — untuk sekarang, matikan lewat database langsung
(`UPDATE api_keys SET active = false WHERE label = '...'`), atau minta
saya buatkan halaman pengelolaan key di Settings kalau butuh sering
dipakai.

---

## 2. Base URL

```
https://<domain-vercel-kamu>/api/v1
```

Ganti `<domain-vercel-kamu>` dengan domain production yang sekarang
dipakai.

---

## 3. Daftar Endpoint

Semua response sukses berbentuk:
```json
{ "data": [...], "count": 10, "generatedAt": "2026-08-21T10:00:00.000Z" }
```
(endpoint yang hasilnya satu objek, bukan list, tidak punya `count`).

Response gagal (key salah/tidak ada):
```json
{ "error": "Unauthorized. Sertakan header 'Authorization: Bearer <API_KEY>' ..." }
```
dengan HTTP status `401`.

### GET `/api/v1/activities`
Data aktivitas harian.

| Query param | Keterangan |
|---|---|
| `date` | Filter 1 tanggal (`YYYY-MM-DD`) |
| `from`, `to` | Filter rentang tanggal |
| `shift` | `1`, `2`, atau `3` |
| `status` | `pending` atau `completed` |
| `limit` | Default 200, maksimal 500 |

### GET `/api/v1/troubleshooting`
Data troubleshoot/isu.

| Query param | Keterangan |
|---|---|
| `date`, `from`, `to`, `shift`, `limit` | sama seperti di atas |
| `status` | `pending`, `in_progress`, atau `completed` |

Field response termasuk `title`, `description`, `ticketReference`,
`affectedVs`, `affectedPool`, `resolution`, `status`, `engineerName`.

### GET `/api/v1/titipan`
Data titipan/handover task (yang masih hidup lintas shift).

| Query param | Keterangan |
|---|---|
| `status` | `pending`, `in_progress`, `completed` |
| `category` | `none`, `support`, `mop`, `scm`, `ncm`, `ekse` |
| `limit` | Default 200, maksimal 500 |

### GET `/api/v1/mop`
Data MOP (dokumen prosedur).

| Query param | Keterangan |
|---|---|
| `status` | `menunggu_review` atau `selesai_review` |
| `limit` | Default 200, maksimal 500 |

Termasuk `fileUrl` (link file asli di Vercel Blob) kalau butuh dikirim
juga.

### GET `/api/v1/calendar`
Data Calendar (switch over/switch back, dsb).

| Query param | Keterangan |
|---|---|
| `from`, `to` | Filter rentang tanggal terhadap `startAt` |
| `limit` | Default 200, maksimal 500 |

Field termasuk `endType` (`undetermined`/`in_progress`/`determined`),
`plannedEndAt`, `actualEndAt` — kalau `actualEndAt` kosong berarti masih
berjalan.

### GET `/api/v1/schedule`
Jadwal shift engineer. Dua mode:

**Mode 1 — siapa masuk shift di 1 tanggal (default kalau gak ada param):**
```
GET /api/v1/schedule?date=2026-08-21
```
Response:
```json
{
  "data": {
    "date": "2026-08-21",
    "shift1": [{ "id": 1, "name": "...", "displayName": "...", "shiftValue": "1" }],
    "shift2": [...],
    "shift3": [...]
  }
}
```

**Mode 2 — data mentah rentang tanggal (buat sinkron ke spreadsheet):**
```
GET /api/v1/schedule?from=2026-08-01&to=2026-08-31
```
Response: list `{ date, shiftValue, engineerName }` per baris jadwal —
cocok buat di-loop langsung jadi baris spreadsheet.

### GET `/api/v1/handover-summary`
Endpoint gabungan, dirancang khusus buat laporan per-jam ke WA/atasan
(gak perlu manggil banyak endpoint lalu digabung manual).

| Query param | Keterangan |
|---|---|
| `date` | Default hari ini |
| `shift` | Default `1` |

Response gabungan: siapa yang standby shift itu, activity & troubleshoot
hari itu, plus titipan yang masih belum selesai (lintas hari, gak
terbatas tanggal tertentu — karena titipan yang belum kelar tetap
relevan sampai selesai).

---

## 4. Contoh pemakaian

### curl
```bash
curl -H "Authorization: Bearer f5ops_xxxxxxxxxxxxxxxxxxxx" \
  "https://domain-kamu.vercel.app/api/v1/handover-summary?date=2026-08-21&shift=1"
```

### Google Apps Script (buat sinkron ke Spreadsheet)
```javascript
function syncJadwalShift() {
  const res = UrlFetchApp.fetch(
    "https://domain-kamu.vercel.app/api/v1/schedule?from=2026-08-01&to=2026-08-31",
    { headers: { Authorization: "Bearer f5ops_xxxxxxxxxxxxxxxxxxxx" } }
  );
  const json = JSON.parse(res.getContentText());
  const sheet = SpreadsheetApp.getActiveSheet();
  json.data.forEach((row) => {
    sheet.appendRow([row.date, row.engineerName, row.shiftValue]);
  });
}
```

### Node.js (bot WA/bot laporan)
```javascript
const res = await fetch(
  "https://domain-kamu.vercel.app/api/v1/handover-summary?shift=1",
  { headers: { Authorization: "Bearer f5ops_xxxxxxxxxxxxxxxxxxxx" } }
);
const { data } = await res.json();
// data.engineersOnDuty, data.activities, data.troubleshooting, data.openTitipan
```

---

## 5. Yang perlu dikirim ke tim/pihak yang mau integrasi

Kirim 4 hal ini (lewat jalur aman — chat pribadi/vault, **jangan** taruh
di grup terbuka atau commit ke repo publik):

1. **Base URL**: `https://<domain-vercel-kamu>/api/v1`
2. **API key** milik integrasi mereka (hasil dari `npm run db:api-key`)
3. **Dokumen ini** (atau minimal daftar endpoint & contoh di atas)
4. Info kalau key **cuma read-only** (gak bisa ubah/hapus data lewat API
   ini — aman dipakai integrasi luar) dan minta mereka kabari kamu kalau
   key perlu diganti/dicabut.

---

## 6. Catatan keamanan & batasan

- Semua endpoint **read-only** (cuma `GET`) — sistem luar gak bisa ubah
  data lewat API ini.
- Belum ada rate limiting — cukup untuk beberapa integrasi internal;
  kalau nanti dipakai banyak sistem sekaligus dengan frekuensi tinggi,
  kabari untuk ditambahkan.
- Key disimpan ter-hash di database (bukan plain text) — sama seperti
  password.
- Kalau butuh endpoint tambahan (misal format response khusus buat bot
  tertentu) atau UI untuk kelola/cabut key dari Settings, tinggal minta.
