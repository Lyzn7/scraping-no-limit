# DataScraper - Content & Sentiment Chrome Extension

Ekstensi Google Chrome (Manifest V3) yang dirancang khusus untuk mengekstrak data **Content** dan **Sentiment** dari tabel media sosial / analitik (sesuai struktur tabel `test.php`) dalam satu halaman dan mengekspor hasilnya langsung ke file **CSV** yang kompatibel dengan Microsoft Excel dan Google Sheets.

---

## 🚀 Fitur Utama

1. **⚡ Fitur Otomasi Multi-Page (Auto Scrape)**:
   - **Otomatis Memilih Limit 100**: Membuka dropdown limit Material-UI (`#select-limit`) dan memilih opsi 100 secara otomatis.
   - **Pindah Halaman Otomatis**: Menavigasi dari halaman 1, 2, 3, dan seterusnya hingga halaman terakhir.
   - **Delay &ge; 3 Detik**: Menyediakan jeda waktu setidaknya 3 detik di setiap perpindahan halaman dengan indikator *countdown timer* agar data selesai dimuat sempurna.
   - **Floating Widget di Layar**: Menampilkan bar kontrol melayang di pojok kanan atas halaman web sehingga proses scraping tetap berjalan meskipun popup ekstensi ditutup.
   - **Otomatis Gabung & Download CSV**: Menggabungkan seluruh data dari setiap halaman tanpa duplikasi, dan otomatis mengunduh CSV begitu selesai.
2. **Ekstraksi Khusus Content & Sentiment**:
   - Mengekstrak teks lengkap (Twitter, Instagram, TikTok, YouTube).
   - Menangani teks multiline, emoji (⭐, 👏, 🫂), dan tanda baca khusus tanpa terpotong.
   - Mengabaikan elemen UI yang tidak relevan (avatar, tombol translate, link to source).
   - Mendeteksi sentimen secara akurat (**Positive**, **Neutral**, **Negative**), baik dari teks label maupun indikator ikon aktif.
3. **Ekspor CSV Sesuai Standar RFC 4180**:
   - Mendukung **UTF-8 BOM (`\uFEFF`)**, memastikan emoji dan karakter bahasa Indonesia terbaca sempurna saat dibuka di Microsoft Excel (tanpa masalah font rusak / *mojibake*).
   - Menangani karakter koma, tanda petik ganda (`"`), dan baris baru (*newline*) dengan benar.
4. **Statistik & Preview Interaktif**:
   - Ringkasan jumlah data: Total, Positive, Neutral, Negative.
   - Tabel preview langsung di popup ekstensi dengan fitur klik untuk memperluas teks (*expand*).
   - Filter pill cepat: *Semua*, *Positive*, *Neutral*, *Negative*.
   - Kotak pencarian (*Search Bar*) instan.
5. **Opsi Fleksibel**:
   - Pilihan separator CSV: Koma (`,`) atau Titik Koma (`;` untuk Excel regional Indonesia).
   - Opsi menyertakan kolom tambahan (No, Username, Link Sumber) jika dibutuhkan.
   - Tombol **Salin CSV** untuk paste langsung ke spreadsheet.

---

## 🛠️ Cara Memasang Ekstensi di Google Chrome

1. Buka browser **Google Chrome**.
2. Masuk ke halaman pengelolaan ekstensi:
   - Ketik `chrome://extensions` pada address bar lalu tekan Enter, atau
   - Klik menu titik tiga di kanan atas > **Extensions** > **Manage Extensions**.
3. Aktifkan **Developer mode** (Mode Pengembang) di pojok kanan atas.
4. Klik tombol **Load unpacked** (Muat yang belum dibongkar) di pojok kiri atas.
5. Pilih folder proyek ini:
   ```
   C:\projectitb
   ```
6. Ekstensi **DataScraper - Content & Sentiment** akan langsung muncul dan aktif di daftar ekstensi Chrome Anda!
7. Klik ikon *Puzzle* (Extensions) di toolbar Chrome lalu pin ekstensi agar mudah diakses.

---

## 📖 Cara Menggunakan Fitur Otomasi (Multi-Page)

1. Buka halaman tabel target (misalnya [test_page.html](file:///c:/projectitb/test_page.html) atau dashboard analitik Anda).
2. Klik ikon ekstensi **DataScraper** di pojok kanan atas Chrome.
3. Pada panel **⚡ Otomasi Multi-Page**:
   - Limit secara *default* sudah terset ke **100 baris**.
   - Delay per halaman secara *default* sudah terset ke **3 detik** (dapat diubah jika koneksi lambat).
   - Maksimal Halaman: Biarkan kosong / "Semua" untuk scrape sampai halaman terakhir, atau isi angka (misal `5` untuk 5 halaman).
4. Klik tombol **🚀 Mulai Otomasi (Limit 100 & Auto Next)**.
5. Ekstensi akan:
   - Mengklik menu limit dan memilih opsi **100**.
   - Menunggu jeda 3 detik agar data termuat.
   - Mulai mengekstrak data dari halaman 1, menekan tombol *Next*, menunggu 3 detik, mengekstrak halaman 2, dan seterusnya.
   - Menampilkan **Floating Widget** di pojok kanan atas layar Anda sehingga Anda dapat memantau progres (*countdown delay*, nomor halaman, jumlah baris data) bahkan saat popup ekstensi ditutup.
6. Begitu mencapai halaman terakhir atau Anda menekan tombol **⏹ Hentikan**, seluruh data yang terkumpul dari semua halaman akan otomatis digabungkan dan diunduh dalam file CSV!

---

## 📁 Struktur Berkas

```
c:\projectitb\
├── manifest.json         # Konfigurasi Manifest V3 Chrome Extension
├── popup\
│   ├── popup.html        # Antarmuka UI popup ekstensi
│   ├── popup.css         # Styling modern dark mode & glassmorphism
│   └── popup.js          # Controller UI, filter, dan generator CSV
├── scripts\
│   ├── scraper.js        # Engine parser DOM tabel (Content & Sentiment)
│   └── content.js        # Content script message listener
├── icons\                # Ikon ekstensi resolusi 16, 32, 48, 128 px
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── test.php              # Berkas sumber referensi struktur tabel
├── test_page.html        # Halaman uji coba lokal langsung di browser
└── README.md             # Panduan lengkap penggunaan
```
