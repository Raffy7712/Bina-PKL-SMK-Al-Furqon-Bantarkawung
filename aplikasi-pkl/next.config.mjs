/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    /* Menandai bahwa pembaruan keamanan Next sudah diadopsi di sini. */
    agentUpgrade: "security",
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Folder hasil build/start (default `.next`). Server uji API/E2E memakai
  // NEXT_DIST_DIR=.next-uji supaya `next build` tidak menimpa folder `.next`
  // milik `npm run dev` yang sedang berjalan (penyebab chunk klien basi →
  // error hydration "server rendered text didn't match the client").
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
