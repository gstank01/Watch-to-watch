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
    // Posters and logos are fetched from TMDB by our server and served from our
    // own domain (/_next/image), so they still show on networks or browsers that
    // block image.tmdb.org, and arrive resized as WebP.
    remotePatterns: [new URL("https://image.tmdb.org/t/p/**")],
    qualities: [75],
    // TMDB image paths are unique per file (new artwork gets a new path), so a
    // long cache is safe.
    minimumCacheTTL: 60 * 60 * 24 * 31,
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
