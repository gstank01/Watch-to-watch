import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We use classic fetch caching (`next: { revalidate }`) for TMDB responses
  // rather than Cache Components.
  cacheComponents: false,
  // Curated data files are read at runtime on the server.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*.yaml"],
  },
  images: {
    // Posters are served straight from TMDB's CDN, which already serves
    // correctly sized images. Skipping the optimizer also keeps us inside
    // TMDB's non-commercial terms (no re-hosting).
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
