import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createRateLimiter,
  hasValidToken,
  loadDotEnv,
  maskPhone,
  normalizePhone,
  parseDotEnv,
  readJsonBody,
  withTimeout,
} from "../lib.js";

function fakeRequest(request) {
  return {
    headers: request.headers ?? {},
    async *[Symbol.asyncIterator]() {
      for (const chunk of request.chunks ?? []) {
        yield Buffer.from(chunk);
      }
    },
  };
}

test("hasValidToken menerima token yang sama persis", () => {
  assert.equal(hasValidToken("Bearer rahasia-rahasia-sangat-panjang", "rahasia-rahasia-sangat-panjang"), true);
});

test("hasValidToken menolak token salah / format asing", () => {
  const token = "rahasia-rahasia-sangat-panjang";
  assert.equal(hasValidToken("Bearer token-salah-pun-sangat-panjang-lho", token), false);
  assert.equal(hasValidToken(`Bearer ${token.slice(0, -1)}`, token), false);
  assert.equal(hasValidToken(`Bearer ${token} ekstra`, token), false);
  assert.equal(hasValidToken(undefined, token), false);
  assert.equal(hasValidToken("Basic abcd", token), false);
  assert.equal(hasValidToken(`bearer ${token}`, token), false);
});

test("normalizePhone menerima nomor dengan kode negara", () => {
  assert.equal(normalizePhone("6281234567890"), "6281234567890");
  assert.equal(normalizePhone("+62 812-3456-7890"), "6281234567890");
  assert.equal(normalizePhone("62 (812) 3456.7890"), "6281234567890");
});

test("normalizePhone menolak nomor tanpa kode negara / non-digit", () => {
  assert.equal(normalizePhone("081234567890"), null);
  assert.equal(normalizePhone("abc628123456"), null);
  assert.equal(normalizePhone(6281234567890), null);
  assert.equal(normalizePhone(""), null);
});

test("maskPhone menyamarkan nomor panjang", () => {
  assert.equal(maskPhone("6281234567890"), "6281*****7890");
  assert.equal(maskPhone("1234567890"), "1234**7890");
});

test("maskPhone menyamarkan nomor pendek tanpa membocorkan banyak digit", () => {
  assert.equal(maskPhone("62812"), "6****");
  assert.equal(maskPhone("12345678"), "1234****");
  assert.equal(maskPhone(""), "");
});

test("readJsonBody menolak Content-Type selain JSON", async () => {
  await assert.rejects(
    readJsonBody(fakeRequest({ headers: { "content-type": "text/plain" } }), { maxBodySize: 16 }),
    (error) => error.statusCode === 415,
  );
});

test("readJsonBody menolak body melebihi batas deklarasi maupun stream", async () => {
  const oversized = "x".repeat(32);
  await assert.rejects(
    readJsonBody(
      fakeRequest({ headers: { "content-type": "application/json", "content-length": "32" } }),
      { maxBodySize: 16 },
    ),
    (error) => error.statusCode === 413,
  );
  await assert.rejects(
    readJsonBody(
      fakeRequest({ headers: { "content-type": "application/json" }, chunks: [oversized] }),
      { maxBodySize: 16 },
    ),
    (error) => error.statusCode === 413,
  );
});

test("readJsonBody menolak JSON tidak valid dan menerima JSON valid", async () => {
  await assert.rejects(
    readJsonBody(
      fakeRequest({ headers: { "content-type": "application/json" }, chunks: ["{salah"] }),
      { maxBodySize: 16 },
    ),
    (error) => error.statusCode === 400,
  );

  const parsed = await readJsonBody(
    fakeRequest({
      headers: { "content-type": "application/json; charset=utf-8" },
      chunks: ['{"phone":"62812"}'],
    }),
    { maxBodySize: 64 },
  );
  assert.deepEqual(parsed, { phone: "62812" });
});

test("rate limiter penuh lalu reset saat jendela baru", () => {
  let time = 1_000;
  const limiter = createRateLimiter({ perMinute: 2, windowMs: 60_000, now: () => time });

  assert.deepEqual(limiter.acquire(), { allowed: true });
  assert.deepEqual(limiter.acquire(), { allowed: true });

  const blocked = limiter.acquire();
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);

  time += 60_000;
  assert.deepEqual(limiter.acquire(), { allowed: true });
});

test("rate limiter menghitung retry-after sisa jendela", () => {
  let time = 10_000;
  const limiter = createRateLimiter({ perMinute: 1, windowMs: 60_000, now: () => time });

  assert.deepEqual(limiter.acquire(), { allowed: true });
  time += 20_000;
  assert.equal(limiter.acquire().retryAfterSeconds, 40);
  assert.equal(limiter.remaining, 0);
});

test("rate limiter menolak konfigurasi tidak wajar", () => {
  assert.throws(() => createRateLimiter({ perMinute: 0 }), /perMinute/);
  assert.throws(() => createRateLimiter({ perMinute: 2.5 }), /perMinute/);
});

test("withTimeout meneruskan hasil bila cukup cepat", async () => {
  assert.equal(await withTimeout(Promise.resolve("hasil"), 1_000), "hasil");
});

test("withTimeout memberi error 504 saat lewat batas waktu", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 25),
    (error) => error.statusCode === 504,
  );
});

test("parseDotEnv membaca baris biasa, kutipan, dan komentar", () => {
  const parsed = parseDotEnv(
    [
      "# komentar utuh",
      "",
      "PORT=3001",
      "HOST = 127.0.0.1",
      'API_TOKEN="token-kutip-ganda"',
      "API_TOKEN_KUTIP_TUNGGA='token-kutip-tungga'",
      "API_KEY=abc=def",
      "#PORT=9999",
      "baris_rusak_tanpa_sep",
      "pascalCase=true",
    ].join("\n"),
  );

  assert.deepEqual(parsed, {
    PORT: "3001",
    HOST: "127.0.0.1",
    API_TOKEN: "token-kutip-ganda",
    API_TOKEN_KUTIP_TUNGGA: "token-kutip-tungga",
    API_KEY: "abc=def",
    pascalCase: "true",
  });
});

test("parseDotEnv menoleransi baris baru gaya Windows", () => {
  assert.deepEqual(parseDotEnv("PORT=3001\r\nHOST=127.0.0.1\r\n"), {
    PORT: "3001",
    HOST: "127.0.0.1",
  });
});

test("loadDotEnv mengisi variabel yang belum ada tanpa menimpa shell", () => {
  const directory = mkdtempSync(join(tmpdir(), "pkl-env-"));
  const file = join(directory, ".env");
  writeFileSync(
    file,
    ["PKL_TEST_DOTENV_VAR=dari-file", "PKL_TEST_PRESET=dari-file"].join("\n"),
  );
  process.env.PKL_TEST_PRESET = "dari-shell";

  try {
    const applied = loadDotEnv(file);
    assert.ok(applied.includes("PKL_TEST_DOTENV_VAR"));
    assert.equal(process.env.PKL_TEST_DOTENV_VAR, "dari-file");
    assert.equal(process.env.PKL_TEST_PRESET, "dari-shell");
  } finally {
    delete process.env.PKL_TEST_DOTENV_VAR;
    delete process.env.PKL_TEST_PRESET;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("loadDotEnv mengabaikan berkas yang tidak ada", () => {
  const applied = loadDotEnv(join(tmpdir(), "pkl-tidak-ada-xyz", ".env"));
  assert.deepEqual(applied, []);
});
