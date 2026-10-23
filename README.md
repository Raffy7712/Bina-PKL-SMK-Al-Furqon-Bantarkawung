# Bina-PKL

Sistem informasi Praktik Kerja Lapangan untuk SMK Al Furqon Bantarkawung
(NPSN 20326420, Jl. Raya Bantarkawung, Kab. Brebes). Satu aplikasi web untuk
siswa, pembimbing DUDI, pembimbing sekolah, dan admin, ditambah satu bot
WhatsApp pendamping.

Isi repositori:

```
aplikasi-pkl/       aplikasi web (Next.js 16, React 19, MySQL/MariaDB)
aplikasipkl-bot/    bot WhatsApp (Baileys, HTTP API)
docker-compose.yml  web + bot + database + Caddy dalam satu berkas
Caddyfile           HTTPS otomatis untuk domain sendiri
.env.example        contoh konfigurasi
```

## Fitur

- **Empat peran** dengan dasbor masing-masing: siswa, pembimbing DUDI,
  pembimbing sekolah, admin. Rute halaman dijaga `src/proxy.js`.
- **Jurnal harian dua tahap**: `menunggu_dudi` lalu `menunggu_sekolah`, berakhir
  `diterima` atau `ditolak`. Setiap keputusan menyimpan nama verifikator, waktu,
  dan pesan untuk siswa.
- **Laporan PKL**: unggah berkas sungguhan, alur revisi ber-versi, jawaban siswa
  atas catatan penguji, dan rubrik empat aspek yang rata-ratanya menjadi nilai
  akhir.
- **Daftar hadir otomatis** dari jurnal, lengkap dengan rekap bulanan, cetak,
  dan ekspor CSV. Tidak ada input absensi terpisah.
- **Check-in GPS** dengan radius per mitra. Jarak dan akurasi dihitung di server.
- **Lampiran aman**: tipe diperiksa dari isi berkas, path berupa UUID, unduhan
  selalu `attachment` dan `nosniff`, cakupan unduh mengikuti peran.
- **Impor siswa massal** dari Excel dengan pratinjau dan template ber-dropdown.
- **Pusat notifikasi**: lonceng dalam aplikasi, pesan WhatsApp lewat bot, dan
  pengingat harian otomatis untuk siswa yang belum menulis jurnal.
- **Masuk dengan Google** (opsional). Akun tetap dikendalikan admin, tidak ada
  pendaftaran mandiri.

## Tumpukan

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, Tailwind v4, JavaScript murni |
| API | Route Handlers di `src/app/api/*` |
| Database | MySQL/MariaDB lewat `mysql2` (pool async, skema dan seed di `src/lib/db.js`, tanpa ORM) |
| Auth | Cookie sesi httpOnly bertanda tangan HMAC-SHA256, hash sandi scrypt |
| Peta | Leaflet + OpenStreetMap, tanpa API key |
| WhatsApp | Bot terpisah (Baileys) lewat HTTP + Bearer token |

## Menjalankan di lokal

```bash
cd aplikasi-pkl
npm install
npm run dev            # http://localhost:3000
```

Database dibuat dan diisi data contoh otomatis pada permintaan pertama. Isi
`aplikasi-pkl/.env.local` (contoh lengkap: `aplikasi-pkl/.env.example`):

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=pkl
DB_PASSWORD=...
DB_NAME=pkl_dev
DB_NAME_TEST=pkl_test
SESSION_SECRET=...        # wajib, minimal 32 karakter
```

Perintah lain:

```bash
npm run lint
npm run build
npm run db:reset          # hapus DB_NAME lalu buat ulang + data contoh
npm run db:stress         # isi pkl_stress dengan 200 siswa untuk uji beban
npm run bench             # latensi dan ukuran payload per endpoint
npm run test:api          # uji API terhadap server uji
npm run test:e2e          # alur lengkap terhadap server uji
npm run test:impor        # logika impor XLSX
```

Server uji memakai `pkl_test`, bukan `pkl_dev`, dan build-nya ditaruh di
`.next-uji` supaya tidak menimpa `.next` milik `npm run dev`.

## Akun data contoh

| Peran | Login | Sandi |
| --- | --- | --- |
| Admin | `admin@its-raffy.my.id` | `admin123` |
| Pembimbing sekolah | `rina@its-raffy.my.id` | `guru123` |
| Pembimbing DUDI | `bagas@nusantara.id` | `dudi123` |
| Siswa | `2401001` | `siswa123` |

Siswa memakai pola NIS sebagai sandi dan email `NIS@its-raffy.my.id`. Ganti
semua sandi sebelum dipakai sekolah sungguhan.

## API

Semua endpoint memakai cookie sesi: `401` belum masuk, `403` salah peran, `409`
konflik, `429` terlalu banyak percobaan masuk.

| Endpoint | Peran | Fungsi |
| --- | --- | --- |
| `POST /api/auth/login` | publik | `{ identifier, password }` → cookie + `{ user, href }` |
| `GET /api/auth/status` | publik | selalu 200: `{ masuk }` atau `{ masuk, user }` |
| `POST /api/auth/logout` | login | hapus cookie |
| `GET /api/auth/me` | login | profil + `href` dasbor |
| `GET /api/auth/google/status` | publik | `{ aktif, host }` |
| `GET /api/auth/google/mulai` | publik | mulai alur OAuth (`mode=masuk\|tautkan`) |
| `GET /api/auth/google/callback` | publik | titik balik OAuth |
| `GET/POST /api/akun` | login | profil sendiri, ubah sandi, username, foto |
| `GET /api/jurnal` | semua | daftar terpaginasi (baku 500 baris) |
| `POST /api/jurnal` | siswa | tulis jurnal baru |
| `GET /api/jurnal/:id` | semua | detail + lampiran + check-in hari itu |
| `POST /api/jurnal/:id/verify` | dudi, sekolah | `{ aksi, catatan }` |
| `GET /api/laporan` | semua | daftar + `penilaian` dan `nilaiAkhir` |
| `POST /api/laporan` | siswa | unggah baru atau revisi |
| `POST /api/laporan/:id/review` | sekolah, admin | `{ aksi, catatan, penilaian? }` |
| `GET /api/ringkas` | admin, sekolah, dudi | agregat dasbor sekali jalan |
| `POST /api/berkas` | siswa | unggah lampiran (multipart) |
| `GET /api/berkas/:id` | semua | unduh lampiran sesuai peran |
| `POST /api/checkin` | siswa | check-in GPS di dalam radius mitra |
| `GET /api/absensi` | admin, sekolah | matriks kehadiran satu bulan |
| `GET/POST/PATCH/DELETE /api/siswa` | admin | kelola siswa dan akunnya |
| `POST /api/siswa/import` | admin | impor massal, idempoten |
| `GET /api/siswa/template` | admin | template XLSX ber-dropdown |
| `GET/POST/PATCH/DELETE /api/dudi` | admin | kelola mitra dan akun pembimbing |
| `GET/POST/PATCH/DELETE /api/kelas` | admin | master kelas |
| `GET/POST/PATCH/DELETE /api/sekolah` | admin | akun pembimbing sekolah |
| `POST /api/geocode` | admin, siswa | link Google Maps atau alamat → koordinat |
| `GET /api/notifikasi` | login | notifikasi sendiri + `belumDibaca` |
| `POST /api/notifikasi/baca` | login | tandai dibaca |
| `GET /api/notifikasi/log` | admin | log pengiriman WhatsApp |
| `POST /api/notifikasi/kirim` | admin | kirim pesan atau pengingat massal |
| `GET /api/wa/status` | admin | kondisi bot |
| `GET/PATCH/POST /api/pengaturan/pengingat` | admin | jadwal pengingat harian |

## Deploy ke VPS

Panduan ini untuk Ubuntu 24.04 dengan domain sendiri dan HTTPS otomatis.

### 1. Server dan DNS

| Kebutuhan | Saran |
| --- | --- |
| VPS | 1 vCPU, RAM 2 GB, disk 25 GB |
| OS | Ubuntu 24.04 LTS |
| Domain | satu subdomain, misal `pkl.sekolah.sch.id` |
| Akses | SSH dengan kunci, user non-root yang bisa `sudo` |

Buat satu record DNS: `pkl  A  <IP-VPS>`, lalu tunggu propagasi
(`dig +short pkl.sekolah.sch.id`).

### 2. Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker "$USER"
```

Keluar dan masuk SSH sekali agar grup berlaku.

### 3. Kode

```bash
git clone <url-repo> pkl
cd pkl
```

Tanpa GitHub, kirim arsip dari laptop:

```bash
tar --exclude=node_modules --exclude=.next --exclude=data -czf pkl.tgz .
scp pkl.tgz user@IP-VPS:~/
```

### 4. Konfigurasi

```bash
cp .env.example .env
nano .env
```

| Variabel | Cara mengisi |
| --- | --- |
| `DOMAIN` | domain yang dipakai |
| `DB_PASSWORD` | `openssl rand -base64 24` |
| `DB_ROOT_PASSWORD` | `openssl rand -base64 24`, beda dari di atas |
| `SESSION_SECRET` | `openssl rand -base64 32`, minimal 32 karakter |
| `WA_BOT_TOKEN` | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` / `SECRET` | dari Google Cloud Console, boleh kosong dulu |
| `GOOGLE_REDIRECT_URI` | `https://DOMAIN/api/auth/google/callback` |

### 5. Jalankan

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f web
```

Buka `https://DOMAIN`. Sertifikat dibuat otomatis oleh Caddy, jadi port 80 dan
443 harus terbuka dan DNS sudah mengarah ke server.

Pindai QR bot sekali: `docker compose logs -f bot`, lalu WhatsApp > Perangkat
tertaut > Tautkan perangkat. Sesi tersimpan di volume `wa_session`.

### 6. Google OAuth

Tambahkan `https://DOMAIN/api/auth/google/callback` di Authorized redirect URIs
pada Google Cloud Console. Tanpa langkah ini tombol Masuk dengan Google gagal.

### 7. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Port 3306, 3000, dan 3001 tidak boleh dibuka ke internet.

### 8. Backup harian

Simpan sebagai `/usr/local/bin/backup-pkl`, lalu `chmod +x`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /home/<user>/pkl
TANGGAL=$(date +%F)
SUMBER=$(grep -E '^DB_NAME=' .env | cut -d= -f2)
ROOT=$(grep -E '^DB_ROOT_PASSWORD=' .env | cut -d= -f2)

docker compose exec -T db mariadb-dump --single-transaction -u root -p"$ROOT" "$SUMBER" \
  > "/var/backups/pkl/db-$TANGGAL.sql"
docker run --rm -v "$(pwd)_berkas:/data:ro" -v /var/backups/pkl:/out alpine \
  tar czf "/out/berkas-$TANGGAL.tar.gz" -C /data .
```

Jadwalkan `0 1 * * * /usr/local/bin/backup-pkl`, dan uji restore sekali.

### 9. Update dan rollback

```bash
git pull
docker compose up -d --build
```

Migrasi database berjalan pada permintaan pertama setelah container baru hidup.
Untuk kembali ke versi sebelumnya, ganti `build:` pada `docker-compose.yml`
menjadi `image: ghcr.io/<user>/<repo>-web:<tag>`, lalu `docker compose up -d`.

### 10. Variasi pemasangan

**Tanpa domain, jaringan sekolah:**

```bash
docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d --build
```

Aplikasi terbuka di `http://IP-SERVER:3000`, tanpa HTTPS. Jangan dipakai untuk
alamat publik karena sandi terkirim tanpa enkripsi.

**Lewat Cloudflare Tunnel, domain sendiri:**

1. Dashboard Cloudflare > Zero Trust > Networks > Tunnels > Create a tunnel >
   Cloudflared, beri nama.
2. Salin token ke `TUNNEL_TOKEN` di `.env`, lalu buat kredensial:

```bash
set -a; . ./.env; set +a
python3 - <<'PY'
import base64, json, os, pathlib
token = os.environ["TUNNEL_TOKEN"].strip()
data = json.loads(base64.urlsafe_b64decode(token + "=" * (-len(token) % 4)))
os.makedirs("tunnel", exist_ok=True)
path = pathlib.Path("tunnel/credentials.json")
path.write_text(json.dumps({
    "AccountTag": data["a"],
    "TunnelSecret": data["s"],
    "TunnelID": data["t"],
}))
path.chmod(0o600)
PY
```

3. Isi hostname dan `service: http://web:3000` di `tunnel/config.yml`, lalu buat
   record CNAME ke `<id-tunnel>.cfargotunnel.com` dengan proxy aktif.
4. Jalankan:

```bash
docker compose -f docker-compose.yml -f docker-compose.lan.yml \
               -f docker-compose.tunnel.yml up -d
```

Kalau hostname di dashboard diisi Service Type HTTPS, pengunjung mendapat galat
525, karena container melayani HTTP biasa.

**Alamat acak tanpa akun:**

```bash
docker compose -f docker-compose.yml -f docker-compose.lan.yml \
               -f docker-compose.tunnel-cepat.yml up -d
docker compose logs -f tunnel   # alamat trycloudflare.com
```

Alamat berganti setiap container dibuat ulang atau server reboot.

**Kalau DNS keluar diblokir (UDP 53):**

Gejalanya `docker pull` gagal dengan `i/o timeout`. Perbaiki di server:

```bash
sudo mkdir -p /etc/systemd/resolved.conf.d
sudo tee /etc/systemd/resolved.conf.d/99-pkl-dot.conf >/dev/null <<'CONF'
[Resolve]
DNS=1.1.1.1#security.cloudflare-dns.com 1.0.0.1#security.cloudflare-dns.com
DNSOverTLS=yes
FallbackDNS=
Domains=~.
CONF
sudo systemctl restart systemd-resolved
```

**Memindahkan data lama ke server:** jangan nyalakan `web` sebelum data masuk,
karena aplikasi mengisi data contoh saat database masih kosong.

```bash
mariadb-dump -u pkl -p --single-transaction --no-tablespaces pkl_dev > pkl_dev.sql
scp pkl_dev.sql user@IP-SERVER:~/

docker compose up -d db
docker compose exec -T db mariadb -uroot -p"$DB_ROOT_PASSWORD" \
  -e "CREATE DATABASE IF NOT EXISTS pkl_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
docker compose exec -T db mariadb -uroot -p"$DB_ROOT_PASSWORD" pkl_dev < ~/pkl_dev.sql
docker compose up -d
```

### Yang harus dijaga

1. Satu instance `web` saja. Penjadwal pengingat ada di dalam proses aplikasi.
2. Jangan buka 3306, 3000, 3001 ke internet.
3. `.env` berisi semua rahasia, jangan di-commit.
4. Domain harus mengarah ke server sebelum `compose up`, kalau tidak Caddy gagal
   mengambil sertifikat.

### Kalau ada masalah

| Gejala | Periksa |
| --- | --- |
| Situs tidak terbuka | `docker compose ps`, `logs caddy`, DNS |
| Sertifikat tidak terbit | port 80/443 terbuka, domain sudah propagasi |
| Halaman 500 | `docker compose logs web`, biasanya koneksi DB |
| Bot tidak mengirim pesan | `logs bot`, sesi perlu scan QR ulang |
| Login Google gagal | redirect URI terdaftar dan sama persis |
| Login lewat IP lokal selalu balik ke halaman masuk | cookie sesi butuh HTTPS; hapus `SESSION_COOKIE_SECURE` kalau diset `1` |

## Panduan review untuk guru pembimbing

Bagian ini untuk Bapak/Ibu yang meninjau kesesuaian alur dengan prosedur PKL
sekolah, bukan menilai kode.

| Hal | Nilai |
| --- | --- |
| Alamat aplikasi | `https://pkl-alf.its-raffy.my.id` |
| Alamat jaringan sekolah | `http://192.168.2.254:3000` |
| Browser | Chrome atau Edge versi terbaru |

Semua akun memakai sandi yang sama saat review: **`1`**. Kolom login bisa diisi
email, NIS, atau username yang diatur sendiri.

| Peran | Login | Nama tampil |
| --- | --- | --- |
| Admin sekolah | `admin@its-raffy.my.id` | Muhammad Raffi |
| Pembimbing sekolah | `Testtt@its-raffy.my.id` | Amin Mutakin, S.Kom. |
| Pembimbing DUDI | `testt@its-raffy.my.id` | Testt |
| Siswa | `123456` | Muhammad Raffi |
| Siswa | `654321` | Anjani Nailatussa'adah |

Sandi `1` hanya untuk tahap review dan diganti sebelum dipakai sungguhan.

### Semua peran: akun sendiri

1. Buka **Akun & Keamanan**.
2. **Profil** > **Unggah foto**, pilih gambar JPG/PNG/WEBP maksimal 2 MB. Foto
   tampil di kartu profil dan di daftar siswa. **Hapus** mengembalikan inisial.
3. **Username untuk masuk**: isi username pendek lalu simpan. Setelah itu akun
   bisa masuk dengan username, email, atau NIS.

### Siswa

1. **Jurnal Harian** > **Tambah Jurnal**: judul, uraian, jam masuk dan keluar,
   lampiran bukti.
2. **Lokasi DUDI** > **Check-In dengan GPS**: hanya diterima di dalam radius
   tempat PKL.
3. **Laporan**: unggah berkas laporan.
4. Setelah diterima, buka detail laporan untuk melihat pesan penguji, nilai
   rubrik, dan riwayat.

### Pembimbing DUDI

1. **Verifikasi Jurnal**: antrean di kiri, detail di kanan.
2. **Terima**: pesan boleh kosong.
3. **Tolak**: pesan koreksi wajib diisi.
4. Coba pencarian nama atau judul, dan tombol **Tinjau lagi** di riwayat.

### Pembimbing sekolah

1. **Verifikasi Jurnal** untuk tahap kedua.
2. **Review Laporan**: **Terima** menampilkan rubrik empat aspek dan kolom pesan,
   **Minta Revisi** mewajibkan pesan.

### Admin sekolah

1. **Dasbor**: ringkasan siswa, jurnal, kehadiran, aktivitas terbaru.
2. **Data Siswa**: tambah, ubah, reset sandi ke NIS, hapus, pengingat per siswa.
3. **Mitra DUDI**: data tempat PKL, radius check-in, akun pembimbing.
4. **Tinjau Jurnal**: semua jurnal dan laporan termasuk yang sudah selesai.
5. **Daftar Hadir**: rekap dari jurnal, bisa dicetak dan diekspor.
6. **Pusat Notifikasi**: kirim pesan, pengingat massal, jadwal pengingat harian.
7. **Pembimbing Sekolah**: kelola akun guru pembimbing.

### Yang sudah diketahui belum sempurna

1. Data contoh sedikit, jadi angka dasbor terlihat kecil.
2. Lampiran lama dari sebelum fitur unggah hanya tersimpan sebagai nama berkas.
3. Notifikasi WhatsApp butuh bot menyala dan nomor terdaftar. Tanpa bot,
   notifikasi dalam aplikasi tetap masuk.
4. Tampilan ponsel belum diuji menyeluruh di perangkat nyata.
5. Belum ada menu lupa sandi. Sandi siswa direset admin menjadi NIS.
6. Radius check-in bawaan 100 meter, bisa diubah admin per mitra.

### Cara menulis catatan review

| No | Halaman | Peran | Langkah | Yang diharapkan | Yang terjadi | Prioritas |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Jurnal Harian | Siswa | Unggah PDF 2 MB lalu kirim | Jurnal tersimpan | Muncul pesan galat | Tinggi |

Prioritas: **Tinggi** menghambat pekerjaan, **Sedang** mengganggu tapi ada jalan
lain, **Rendah** saran tampilan atau penamaan.

Yang tidak perlu dinilai: kecepatan server, biaya hosting, pilihan bahasa
pemrograman atau database, dan tampilan detail selama masih terbaca.

## Catatan operasional

- Tanggal dan jam mengikuti zona waktu server.
- Satu instance `web` saja, karena penjadwal pengingat berjalan di dalam proses.
- Lampiran disimpan di volume `berkas`, sesi bot di volume `wa_session`. Keduanya
  harus ikut di-backup.
- `.env` dan `auth_info` tidak pernah masuk repositori.
