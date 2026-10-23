# Baileys membutuhkan Node.js minimal 20.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dependensi dipasang lebih dulu agar cache Docker dapat dipakai ulang.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY main.js lib.js ./

# Sesi WhatsApp disimpan di volume /data agar tidak perlu memindai ulang QR
# ketika container dibuat ulang. Folder dibuat lebih dulu dan dimiliki `node`
# supaya volume baru mewarisi izin tulis yang benar.
ENV WHATSAPP_AUTH_DIR=/data/auth_info
RUN mkdir -p /data/auth_info && chown -R node:node /data
VOLUME /data

# Jalankan sebagai user non-root bawaan image resmi Node.
USER node

EXPOSE 3000
CMD ["node", "main.js"]
