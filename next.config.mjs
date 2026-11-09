/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the Docker image small for Dokploy.
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
