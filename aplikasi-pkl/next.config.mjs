/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
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
