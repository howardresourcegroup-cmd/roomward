import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloudflare Pages via @cloudflare/next-on-pages
  // All server-side code runs on the Edge Runtime
  images: {
    // Cloudflare Images or unoptimized for Pages (no Node image server)
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async redirects() {
    return [
      // Renamed to /events when "Banquets" became "Conferences & Events".
      // The old path shipped to production, so keep it resolving.
      { source: "/banquets", destination: "/events", permanent: true },
    ];
  },
};

export default nextConfig;
