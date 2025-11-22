# 📚 KomikRu Manga Scraper Engine - Smart Mirroring System

## 🎯 Overview

Sistem scraper otomatis untuk KomikRu yang menggunakan **Smart Mirroring** dengan cache 24 jam. Sistem ini mengambil data komik dari sumber berlisensi dan menyimpannya ke database Supabase dengan cache image yang cerdas.

---

## 📊 Database Schema

### Tabel Baru yang Ditambahkan:

#### 1. `sources` - Daftar Sumber Scraper
```sql
- id (UUID)
- name (TEXT) - Nama source (contoh: "Manhwalist")
- base_url (TEXT) - URL dasar source
- code (TEXT UNIQUE) - Kode unik (MANHWALIST, SHINIGAMI, KOMIKCAST)
- is_active (BOOLEAN) - Status aktif/nonaktif
- created_at, updated_at (TIMESTAMPTZ)
```

**Data Default:**
- MANHWALIST → https://manhwalist02.site/
- SHINIGAMI → https://08.shinigami.asia/
- KOMIKCAST → https://komikcast03.com/

#### 2. `chapter_pages` - Cache Halaman Chapter (24 Jam TTL)
```sql
- id (UUID)
- chapter_id (UUID FK → chapters)
- page_number (INTEGER) - Nomor halaman
- source_image_url (TEXT) - URL gambar dari source
- cached_image_url (TEXT) - URL jika diupload ke storage sendiri
- cached_at (TIMESTAMPTZ) - Waktu terakhir di-cache
- created_at (TIMESTAMPTZ)
- UNIQUE (chapter_id, page_number)
```

#### 3. `scrape_logs` - Log Aktivitas Scraping
```sql
- id (UUID)
- source_id (UUID FK → sources)
- target_url (TEXT)
- action (TEXT) - FETCH_COMIC_LIST, SYNC_COMIC, FETCH_CHAPTER
- status (TEXT) - SUCCESS, FAILED
- error_message (TEXT)
- created_at (TIMESTAMPTZ)
```

### Kolom Tambahan di Tabel Existing:

#### `komik` table:
- `source_id` (UUID) - Link ke tabel sources
- `source_slug` (TEXT) - Slug komik di website sumber
- `source_url` (TEXT) - URL detail komik di sumber

#### `chapters` table:
- `source_chapter_id` (TEXT) - ID/slug chapter di sumber
- `source_url` (TEXT) - URL chapter di sumber

---

## 🔧 Struktur Backend

### Edge Functions (Supabase Functions)

#### 1. `fetch-comic-list` - Auto Import Full Catalog
**Path:** `supabase/functions/fetch-comic-list/index.ts`

**Input:**
```json
{
  "sourceCode": "ALL" | "MANHWALIST" | "SHINIGAMI" | "KOMIKCAST",
  "maxPages": 10
}
```

**Proses:**
1. Loop setiap source yang aktif
2. Scrape listing page dari source (pagination support)
3. Extract: title, cover, genres, status, source_url
4. Upsert ke tabel `komik` (update if exists)
5. Log ke `scrape_logs`

**Output:**
```json
{
  "success": true,
  "totalComics": 250,
  "errors": []
}
```

**Rate Limiting:** 2 detik delay antar request

---

#### 2. `scrape-comic` - Scraper Halaman Chapter
**Path:** `supabase/functions/scrape-comic/index.ts`

**Input:**
```json
{
  "chapterId": "uuid-chapter-id"
}
```

**Proses:**
1. Ambil data chapter dan source info dari database
2. Cek cache di `chapter_pages`:
   - Jika cache < 24 jam → return cache
   - Jika cache >= 24 jam atau tidak ada → scrape ulang
3. Scrape halaman dari source menggunakan Cheerio
4. Simpan hasil ke `chapter_pages` dengan `cached_at = now()`
5. Log ke `scrape_logs`

**Output:**
```json
{
  "chapterId": "xxx",
  "cached": true/false,
  "pages": [
    { "pageNumber": 1, "imageUrl": "https://..." },
    { "pageNumber": 2, "imageUrl": "https://..." }
  ]
}
```

**Rate Limiting:** 2 detik delay antar request ke domain yang sama

---

#### 3. `sync-comic` - Sync Komik dari Source
**Path:** `supabase/functions/sync-comic/index.ts`

**Input:**
```json
{
  "sourceUrl": "https://manhwalist02.site/manga/example/",
  "sourceCode": "MANHWALIST",
  "komikId": "uuid-optional" // untuk update existing
}
```

**Proses:**
1. Scrape detail komik dari source URL
2. Extract: title, cover, description, genres, status
3. Scrape list semua chapter
4. Insert/update ke tabel `komik` dan `chapters`
5. Log sukses/gagal

**Output:**
```json
{
  "success": true,
  "komikId": "uuid",
  "chaptersCount": 50
}
```

---

### Frontend Library

#### `src/lib/scraper/types.ts` - Type Definitions
Interface TypeScript untuk scraper system

#### `src/lib/scraper/httpClient.ts` - Safe HTTP Client
- Rate limiting per domain (2 detik)
- User-Agent spoofing
- Helper functions untuk extract slug & chapter number

---

## 🎨 Admin Panel Integration

### Admin Panel Pages

#### Admin Sources (`/admin/sources`)
**Component:** `src/pages/admin/AdminSources.tsx`

**Fitur:**
1. **View Sources** - List semua scraper sources dengan status aktif/nonaktif
2. **Toggle Source** - Aktifkan/nonaktifkan source dengan Switch
3. **Sync Comic Form:**
   - Pilih source (dropdown)
   - Input URL komik dari source
   - Tombol "Sync Komik Sekarang"
   - Akan fetch detail + chapters dan simpan ke database

---

#### Admin Catalog (`/admin/catalog`) 🆕
**Component:** `src/pages/admin/AdminCatalog.tsx`

**Fitur:**
1. **Stats Dashboard:**
   - Total komik di database
   - Status scraper (ready/fetching)
   - Waktu sync terakhir

2. **Fetch All Comics:**
   - Tombol untuk scrape seluruh catalog dari semua source
   - Proses otomatis dengan pagination
   - Import ratusan komik sekaligus

3. **Refresh Data:**
   - Update metadata komik existing
   - Tidak menghapus data yang sudah ada

4. **Scraping Logs Viewer:**
   - Real-time log aktivitas scraping
   - Filter by source, action, status
   - Error tracking

**Navigasi:**
- Sidebar admin: Dashboard | Komik | Chapters | Iklan | Komentar | Scraper | **Catalog**
- Icon: Download

---

## 📖 Alur Kerja

### Skenario 1: Admin Import Full Catalog 🆕
```
1. Admin buka /admin/catalog
2. Klik "Fetch All Comics (10 Pages)"
3. Backend:
   - Loop ke Manhwalist, Shinigami, KomikCast
   - Scrape listing page (pagination)
   - Extract metadata komik
   - Upsert ke database
4. Homepage otomatis menampilkan semua komik baru
5. Total waktu: 5-10 menit untuk ~200-300 komik
```

---

### Skenario 2: User Membuka Chapter
```
1. User klik chapter di KomikRu
2. Frontend load `/read/{slug}/{chapterNumber}`
3. Reader.tsx fetch chapter_images dengan logic:
   a. Cek chapter_pages (scraper cache)
   b. Jika ada & < 24 jam → return cache
   c. Jika ada & >= 24 jam → return cache TAPI trigger background scraping
   d. Jika tidak ada → fallback ke chapter_images lama
4. Display gambar di reader
```

**Smart Mirroring:**
- Cache 24 jam mengurangi beban scraping
- Background refresh = user tidak perlu tunggu
- Hotlink dari source (punya izin) atau bisa upload ke storage sendiri

---

### Skenario 3: Admin Sync Komik Spesifik (Manual)

```
1. Admin buka /admin/sources
2. Pilih source (contoh: MANHWALIST)
3. Input URL: https://manhwalist02.site/manga/solo-leveling/
4. Klik "Sync Komik Sekarang"
5. Backend:
   - Scrape detail komik
   - Scrape list chapter
   - Insert ke komik & chapters
6. Komik muncul di frontend KomikRu
7. Chapter pertama yang dibuka user → akan scrape halaman gambarnya
```

---

## 🔒 Security & Rate Limiting

### Rate Limiting
- **Delay:** 2 detik minimum antar request per domain
- **User-Agent:** Spoofed sebagai browser Chrome terbaru
- **Headers:** Accept-Language ID, proper Accept headers

### RLS Policies
- **sources:** Anyone dapat view, Admin dapat manage
- **chapter_pages:** Anyone dapat view (public cache), Admin dapat manage
- **scrape_logs:** Admin only

### Anti-Block Measures
1. Proper User-Agent
2. Rate limiting per domain
3. Smart caching (tidak scrape brutal)
4. On-demand scraping (hanya chapter yang dibuka user)

---

## 🚀 Future Improvements

### 1. Cron Job Auto-Refresh (Optional)
Bisa ditambahkan cron untuk:
- Refresh top 20 komik paling populer tiap 2 jam
- Scrape chapter terbaru secara otomatis
- Update cache untuk high-traffic chapters

### 2. Upload to Own Storage
Saat ini hotlink dari source (dengan izin). Bisa upgrade ke:
- Download gambar ke Supabase Storage
- Optimize image size
- Isi `cached_image_url` di chapter_pages

### 3. More Sources
Tinggal tambah adapter baru di edge function:
```typescript
else if (sourceCode === 'NEW_SOURCE') {
  // custom scraping logic
}
```

---

## 📝 Testing

### Manual Test Steps:

1. **Test Sync Comic:**
```bash
# Buka admin panel
/admin/sources

# Pilih MANHWALIST
# Input URL: https://manhwalist02.site/manga/test-manga/
# Klik Sync

# Cek database:
# - Komik muncul di tabel komik dengan source_id
# - Chapters masuk ke tabel chapters dengan source_url
```

2. **Test Smart Mirroring:**
```bash
# Buka chapter di frontend
/read/test-manga/1

# First time: Scraping jalan, chapter_pages terisi
# Check network tab: call ke scrape-comic function

# Refresh halaman (< 24 jam): Pakai cache, tidak scraping
# Wait 24+ hours: Auto trigger background scraping
```

3. **Check Logs:**
```sql
SELECT * FROM scrape_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## 🎓 Key Concepts

### Smart Mirroring vs Full Crawling

**Smart Mirroring (Yang Dipakai):**
- ✅ Cache 24 jam
- ✅ On-demand scraping (hanya yang dibuka user)
- ✅ Background refresh
- ✅ Tidak overload source
- ✅ Storage efficient

**Full Crawling (Tidak Dipakai):**
- ❌ Scrape semua sekaligus
- ❌ Butuh storage besar
- ❌ Bisa kena block
- ❌ Waste resources untuk chapter yang tidak pernah dibaca

---

## 📌 Important Notes

1. **Lisensi:** Pastikan memiliki izin resmi dari source website
2. **Hotlinking:** Saat ini pakai URL langsung dari source (dengan izin)
3. **Performance:** Rate limiting mencegah overload dan block
4. **Scalability:** Tinggal tambah source baru dengan adapter minimal

---

## 🆘 Troubleshooting

### "No pages found"
- Cek apakah source_url chapter benar
- Cek selector Cheerio di adapter sesuai struktur HTML source
- Lihat scrape_logs untuk error message

### "Cache tidak refresh"
- Cek cached_at timestamp
- Pastikan logic 24 jam benar (86400000 ms)
- Clear cache manual di chapter_pages jika perlu

### "Rate limit hit"
- Check lastRequestTime di httpClient
- Adjust MIN_DELAY_MS jika perlu (default 2000ms)

---

## 📚 Documentation Links

- Admin Panel: `/admin/sources`
- Edge Functions: `supabase/functions/`
- Types: `src/lib/scraper/types.ts`
- Client: `src/lib/scraper/httpClient.ts`

---

**Status:** ✅ Fully Implemented & Ready to Use
**Last Updated:** 2025-11-21
**Version:** 1.0.0
