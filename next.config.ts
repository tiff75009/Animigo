import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Convex a son propre type checking (bunx convex dev)
    // Les fichiers convex/ causent des erreurs TS2589 dans le build Next.js
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
