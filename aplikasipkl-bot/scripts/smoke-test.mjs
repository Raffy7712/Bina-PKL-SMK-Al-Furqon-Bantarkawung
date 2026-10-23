
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const port = 38383;
const baseUrl = `http://127.0.0.1:${port}`;
const token = "s".repeat(48);
const authDirectory = mkdtempSync(join(tmpdir(), "pkl-smoke-"));

function spawnBot() {
  return spawn(process.execPath, ["main.js"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: {
      ...process.env,
      API_TOKEN: token,
      HOST: "127.0.0.1",
      PORT: String(port),
      WHATSAPP_AUTH_DIR: authDirectory,
      RATE_LIMIT_PER_MINUTE: "3",
      LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return response;
      }
    } catch {
    }
    await delay(100);
  }
  throw new Error("Server tidak merespons /health dalam 5 detik.");
}

async function postNotification(body, { authorization = `Bearer ${token}`, contentType } = {}) {
  return fetch(`${baseUrl}/api/notifications`, {
    method: "POST",
    headers: {
      ...(authorization ? { authorization } : {}),
      "content-type": contentType ?? "application/json",
    },
    body: JSON.stringify(body),
  });
}

const child = spawnBot();

try {
  const health = (await (await waitForServer()).json());
  assert.equal(health.status, "ok");
  assert.equal(health.whatsapp, "disconnected");

  const noAuth = await fetch(`${baseUrl}/api/notifications`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "6281234567890", message: "halo" }),
  });
  assert.equal(noAuth.status, 401);

  const wrongAuth = await postNotification(
    { phone: "6281234567890", message: "halo" },
    { authorization: `Bearer ${"w".repeat(48)}` },
  );
  assert.equal(wrongAuth.status, 401);

  const wrongContentType = await postNotification(
    { phone: "6281234567890", message: "halo" },
    { contentType: "text/plain" },
  );
  assert.equal(wrongContentType.status, 415);

  const badPhone = await postNotification({ phone: "0812345678", message: "halo" });
  assert.equal(badPhone.status, 400);

  const badMessage = await postNotification({ phone: "6281234567890", message: "" });
  assert.equal(badMessage.status, 400);

  const notFound = await fetch(`${baseUrl}/api/tidak-ada`, { method: "POST" });
  assert.equal(notFound.status, 404);

  for (let i = 0; i < 3; i += 1) {
    const offlineSend = await postNotification({
      phone: "6281234567890",
      message: "notifikasi uji",
    });
    assert.equal(offlineSend.status, 503);
  }

  const rateLimited = await postNotification({ phone: "6281234567890", message: "notifikasi uji" });
  assert.equal(rateLimited.status, 429);
  assert.ok(Number(rateLimited.headers.get("retry-after")) >= 1);

  const afterRateLimit = (await (await fetch(`${baseUrl}/health`)).json());
  assert.equal(afterRateLimit.rateRemaining, 0);

  console.log("Smoke test lulus semua kasus.");
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(3_000).then(() => {
      child.kill("SIGKILL");
      return new Promise((resolve) => child.once("exit", resolve));
    }),
  ]);
  rmSync(authDirectory, { recursive: true, force: true });
}
