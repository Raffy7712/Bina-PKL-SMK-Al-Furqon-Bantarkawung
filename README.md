# Bina-PKL

Aplikasi PKL untuk SMK Al Furqon Bantarkawung. Siswa nulis jurnal, DUDI review,
sekolah sahkan, nilai keluar dari rubrik. Ada bot WhatsApp buat pengingat.

Next.js 16, React 19, MySQL. Tanpa ORM. Tanpa TypeScript.

```
aplikasi-pkl/       web
aplikasipkl-bot/    bot WhatsApp (Baileys)
database/           dump data contoh + lampiran
docker-compose*.yml web, bot, db, Caddy
```

## Jalanin

```bash
cd aplikasi-pkl
cp .env.example .env.local
nano .env.local          # isi DB_* dan SESSION_SECRET
npm install
npm run dev
```

Buka `localhost:3000`. Tabel dibuat sendiri, data contoh ikut masuk kalau DB
masih kosong. Kalau tidak mau data contoh, set `PKL_SKIP_SEED=1`.

Yang wajib diisi cuma dua:

- `DB_PASSWORD`, sandi MySQL lokal
- `SESSION_SECRET`, minimal 32 karakter. `openssl rand -base64 32`

Sisanya opsional. Google dan WhatsApp boleh kosong, aplikasinya tetap jalan,
fiturnya saja yang mati.

## Akun data contoh

| Peran | Login | Sandi |
| --- | --- | --- |
| Admin | `admin@its-raffy.my.id` | `admin123` |
| Pembimbing sekolah | `rina@its-raffy.my.id` | `guru123` |
| Pembimbing DUDI | `bagas@nusantara.id` | `dudi123` |
| Siswa | `2401001` | `siswa123` |

Siswa login pakai NIS. Emailnya `NIS@its-raffy.my.id`, dibuat otomatis.

## Perintah

```bash
npm run dev
npm run build
npm run lint

npm run db:reset      # hapus DB_NAME, bikin ulang, isi contoh
npm run db:stress     # 200 siswa palsu ke pkl_stress, buat uji beban
npm run bench         # ukur latensi endpoint

npm run test:api      # 79 tes, hit endpoint sungguhan
npm run test:e2e      # 198 tes, alur lengkap
npm run test:impor    # logika impor XLSX
```

Tes jalan ke `pkl_test`, bukan `pkl_dev`. Build tes masuk `.next-uji` biar nggak
nimpa `.next` punya `npm run dev`.

## Data contoh di database/

`database/pkl_dev.sql` isinya dump DB yang dipakai demo. Nomor WhatsApp sudah
diganti `088866666666`, kredensial Google dan tautan akun Google pribadi sudah
dibuang. Lampiran yang masih nyambung ada di `database/berkas/`.

Cara masukin:

```bash
mariadb -u pkl -p -e "CREATE DATABASE pkl_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mariadb -u pkl -p pkl_dev < database/pkl_dev.sql
cp database/berkas/* ke data/berkas/    # atau PKL_BERKAS_DIR
```

Jangan taruh di `pkl_dev` kalau server itu sudah dipakai sungguhan.

## Deploy

Tiga langkah, sisanya tunggu.

```bash
cp .env.example .env
nano .env                # DOMAIN, DB_PASSWORD, DB_ROOT_PASSWORD, SESSION_SECRET, WA_BOT_TOKEN
docker compose up -d --build
```

Isi `.env` yang benar-benar penting:

```
DOMAIN=            domain yang dipakai, Caddy ambil sertifikat dari sini
DB_PASSWORD=       openssl rand -base64 24
DB_ROOT_PASSWORD=  openssl rand -base64 24, beda dari atas
SESSION_SECRET=    openssl rand -base64 32
WA_BOT_TOKEN=      openssl rand -hex 32
```

DNS harus sudah ngarah ke server sebelum `compose up`, kalau belum Caddy gagal
ambil sertifikat. Port 80 dan 443 harus kebuka.

Setup awal, sekali saja:

```bash
docker compose logs -f bot     # scan QR dari WhatsApp
```

Update:

```bash
git pull && docker compose up -d --build
```

Migrasi jalan sendiri waktu query pertama. Belum ada rollback otomatis, jadi
backup dulu.

### Kalau bukan VPS berdomain

Jaringan sekolah, tanpa HTTPS:

```bash
docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d --build
# buka http://IP-SERVER:3000
```

Tanpa IP publik, pakai Cloudflare Tunnel:

```bash
docker compose -f docker-compose.yml -f docker-compose.lan.yml \
               -f docker-compose.tunnel.yml up -d
```

Detailnya (token tunnel, `tunnel/config.yml`, record DNS) ada di komentar
`docker-compose.tunnel.yml`. Kalau di dashboard Cloudflare kamu isi Service Type
HTTPS, pengunjung dapat 525. Pakai HTTP, container-nya HTTP biasa.

Tunnel cepat tanpa akun, alamatnya ganti tiap restart:

```bash
docker compose -f docker-compose.yml -f docker-compose.lan.yml \
               -f docker-compose.tunnel-cepat.yml up -d
```

Kalau `docker pull` gagal `i/o timeout`, jaringan blokir DNS keluar. Pindah ke
DoT:

```bash
sudo mkdir -p /etc/systemd/resolved.conf.d
sudo tee /etc/systemd/resolved.conf.d/99-dot.conf >/dev/null <<'CONF'
[Resolve]
DNS=1.1.1.1#security.cloudflare-dns.com 1.0.0.1#security.cloudflare-dns.com
DNSOverTLS=yes
FallbackDNS=
Domains=~.
CONF
sudo systemctl restart systemd-resolved
```

### Backup

Belum ada yang terjadwal. Bikin sendiri, jangan ditunda:

```bash
cd /path/ke/repo
docker compose exec -T db mariadb-dump --single-transaction \
  -u root -p"$DB_ROOT_PASSWORD" pkl_dev > ~/backup/db-$(date +%F).sql
```

Lampiran di volume `berkas` dan sesi bot di `wa_session` harus ikut. Uji restore
sekali sebelum butuh beneran.

## Jejak yang sering bikin bingung

- **Satu container web saja.** Penjadwal pengingat jalan di dalam proses. Dua
  replika, pengingat terkirim dua kali.
- **Login lewat IP lokal suka balik ke halaman masuk.** Cookie sesi minta HTTPS.
  Hilangkan `SESSION_COOKIE_SECURE` dari `.env` kalau diset `1`.
- **Google gagal terus.** Redirect URI di Cloud Console harus persis sama dengan
  `https://DOMAIN/api/auth/google/callback`. Kurang satu huruf, gagal.
- **Bot diam.** Cek `docker compose logs bot`, biasanya sesi perlu scan QR lagi.
- **Angka dashboard nol semua.** Biasanya query gagal, lihat `logs web`.
- **`.env` bocor ke git.** Sudah di-ignore, tapi kolom `WA_BOT_TOKEN` di README
  dan screenshot sering lupa ikut disensor.

## Sebelum dipakai sekolah sungguhan

- Ganti semua sandi. Sekarang serba `1` buat demo.
- Sesi bot WhatsApp di `auth_info` itu kredensial. Jangan ikut backup yang
  dibagikan.
- `.env` jangan pernah masuk repo atau chat.
- Kalau mau `SESSION_SECRET` diganti, semua pengguna harus login ulang.

## API

Semua endpoint di `src/app/api/`. Yang sering dipakai:

```
POST /api/auth/login              { identifier, password }
GET  /api/auth/status             selalu 200, buat cek sesi
GET  /api/jurnal                  ?status= &bulan= &limit= &offset=
POST /api/jurnal/:id/verify       dudi, sekolah
POST /api/laporan/:id/review      sekolah, admin
GET  /api/ringkas                 agregat dashboard, sekali jalan
POST /api/checkin                 { lat, lng, akurasi }
```

Sisanya lihat folder itu langsung, tiap route ada nama perannya di baris
`requireRole`. Balasan galat: 401 belum masuk, 403 salah peran, 409 konflik, 429
kebanyakan percobaan login.

## Panduan singkat buat penguji

Alamat demo: `https://pkl-alf.its-raffy.my.id`. Di jaringan sekolah:
`http://192.168.2.254:3000`. Semua akun sandinya `1`.

Yang perlu dicoba:

- **Siswa**: tulis jurnal, check-in GPS di lokasi PKL, unggah laporan.
- **DUDI**: terima jurnal, tolak satu dengan catatan. Tolak wajib isi pesan.
- **Sekolah**: sahkan jurnal tahap dua, terima laporan sambil isi rubrik.
- **Admin**: tambah siswa, atur mitra dan radius, lihat rekap kehadiran.

Yang sudah ketahuan kurang:

- Data contoh sedikit, jadi angka dashboard kecil. Bukan lambat.
- Lampiran lama cuma sisa nama berkas, isinya tidak ada.
- WhatsApp butuh bot nyala. Notifikasi dalam aplikasi tetap masuk walau bot mati.
- Tampilan HP belum diuji di banyak perangkat.
- Belum ada menu lupa sandi. Admin reset ke NIS.

Kalau nemu yang aneh, tulis di issue dengan halaman, peran, langkah, yang
diharapkan, dan yang terjadi.
