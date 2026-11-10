/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the Docker image small for Dokploy.
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async headers() {
    return [
      {
        // The service worker must always be re-checked, or updates never arrive.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
