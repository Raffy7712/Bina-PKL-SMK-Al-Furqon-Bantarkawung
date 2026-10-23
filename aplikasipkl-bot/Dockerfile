FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY main.js lib.js ./

ENV WHATSAPP_AUTH_DIR=/data/auth_info
RUN mkdir -p /data/auth_info && chown -R node:node /data
VOLUME /data

USER node

EXPOSE 3000
CMD ["node", "main.js"]
