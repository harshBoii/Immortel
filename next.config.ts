import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // HeyGen previews (avatars, talking photos, etc.)
      { protocol: "https", hostname: "files2.heygen.ai" },
      { protocol: "https", hostname: "files.heygen.ai" },
      { protocol: "https", hostname: "resource2.heygen.ai" },
      { protocol: "https", hostname: "static.heygen.ai" },
    ],
  },
};

export default nextConfig;
