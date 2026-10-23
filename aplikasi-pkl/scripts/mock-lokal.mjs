import { createServer } from "node:http";

const PORT_GOOGLE = Number(process.env.MOCK_GOOGLE_PORT ?? 3197);
const PORT_WA = Number(process.env.MOCK_WA_PORT ?? 3198);
const TOKEN_GOOGLE = "mock-access-token";

const profilGoogle = {
  sub: process.env.MOCK_GOOGLE_SUB ?? "mock-google-1",
  email: process.env.MOCK_GOOGLE_EMAIL ?? "mock.google@contoh.id",
  email_verified: true,
  name: process.env.MOCK_GOOGLE_NAMA ?? "Akun Google Tiruan",
};

const google = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT_GOOGLE}`);
  const jawab = (kode, data) => {
    res.writeHead(kode, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
  };

  if (req.method === "GET" && url.pathname === "/authorize") {
    const kembali = url.searchParams.get("redirect_uri");
    if (!kembali) {
      jawab(400, { error: "redirect_uri wajib diisi." });
      return;
    }
    const alih = new URL(kembali);
    alih.searchParams.set("code", "mock-code");
    alih.searchParams.set("state", url.searchParams.get("state") ?? "");
    console.log(`  [google] otorisasi → ${profilGoogle.email} (${profilGoogle.sub})`);
    res.writeHead(302, { location: alih.toString() });
    res.end();
    return;
  }
  if (req.method === "POST" && url.pathname === "/token") {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      jawab(200, {
        access_token: TOKEN_GOOGLE,
        token_type: "Bearer",
        expires_in: 3600,
      });
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/userinfo") {
    if (req.headers.authorization !== `Bearer ${TOKEN_GOOGLE}`) {
      jawab(401, { error: "access token salah." });
      return;
    }
    jawab(200, profilGoogle);
    return;
  }
  jawab(404, { error: "Endpoint Google tiruan tidak dikenal." });
});

const waMasuk = [];
const waMulai = Date.now();
const wa = createServer((req, res) => {
  const jawab = (kode, data) => {
    res.writeHead(kode, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
  };

  if (req.method === "GET" && req.url === "/health") {
    jawab(200, {
      status: "ok",
      whatsapp: "connected",
      queueSize: 0,
      rateRemaining: 30,
      uptimeSeconds: Math.floor((Date.now() - waMulai) / 1000),
    });
    return;
  }
  if (req.method === "GET" && req.url === "/terkirim") {
    jawab(200, { total: waMasuk.length, pesan: waMasuk });
    return;
  }
  if (req.method === "POST" && req.url === "/api/notifications") {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      let body = {};
      try {
        body = JSON.parse(data);
      } catch {
      }
      const ke = body.phone ?? "(tanpa nomor)";
      const pesan = String(body.message ?? "");
      const id = `mock-${waMasuk.length + 1}`;
      waMasuk.push({ id, waktu: new Date().toISOString(), phone: ke, message: pesan });
      console.log(`  [bot WA] → ${ke}  (${id}, ${pesan.length} karakter)`);
      jawab(200, { success: true, messageId: id, verified: true });
    });
    return;
  }
  jawab(404, { error: "Endpoint bot tiruan tidak dikenal." });
});

function dengarkan(server, port, label) {
  return new Promise((resolve) => {
    server.on("error", (e) => {
      if (e.code === "EADDRINUSE") {
        console.error(
          `\n  GAGAL: port ${port} sudah dipakai (${label}).\n` +
            "  Kemungkinan ada `npm run mock` lain atau `npm run test:e2e` yang masih jalan — hentikan dulu.\n"
        );
      } else {
        console.error(`  GAGAL menyalakan ${label} di :${port} — ${e.message}`);
      }
      process.exit(1);
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(`  ✓ ${label.padEnd(18)} http://127.0.0.1:${port}`);
      resolve();
    });
  });
}

console.log("\n──────────────────────────────────────────────────────────────");
console.log("  Bina-PKL — mode mock lokal (pendamping `npm run dev`)");
console.log("──────────────────────────────────────────────────────────────");

await dengarkan(google, PORT_GOOGLE, "Google tiruan");
await dengarkan(wa, PORT_WA, "Bot WhatsApp tiruan");

console.log(`
  Profil Google : "${profilGoogle.name}" <${profilGoogle.email}> (sub: ${profilGoogle.sub})
                  → tautkan di http://localhost:3000/akun, lalu coba "Masuk dengan Google"
  Bot WA        : pesan dari aplikasi tampil di terminal ini;
                  daftar pesan → http://127.0.0.1:${PORT_WA}/terkirim
                  (aktif setelah WA_BOT_URL di .env.local diarahkan ke :${PORT_WA})
  Ganti identitas Google:
                  MOCK_GOOGLE_EMAIL=orang@contoh.id MOCK_GOOGLE_NAMA="Nama" npm run mock
  Penting       : hentikan dulu sebelum \`npm run test:e2e\` (port ${PORT_GOOGLE}/${PORT_WA} sama).
──────────────────────────────────────────────────────────────
`);

process.on("SIGINT", () => {
  google.close();
  wa.close();
  console.log("\n  Mode mock dihentikan.");
  process.exit(0);
});
