# Image aplikasi Bina-PKL (Next.js 16, Node 24).
#
# Catatan penting:
# - `npm run build` mengunduh font Google (Bricolage, Space Grotesk, JetBrains
#   Mono), jadi tahap build butuh akses internet.
# - Migrasi/seed database TIDAK dijalankan saat build; baru terjadi pada query
#   pertama, jadi build tidak perlu koneksi MySQL.
# - Lampiran siswa ditulis ke /app/data/berkas (pasang sebagai volume).

# ---------- 1. dependensi (cache terpisah dari kode) ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2. build ----------
FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- 3. runtime ----------
FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs

RUN mkdir -p data/berkas && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
