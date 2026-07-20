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
  async rewrites() {
    return [
      {
        source: '/robust/:path*',
        destination: `https://robust-neon.vercel.app/:path*`,
      },
      // The marketing page is a self-contained static file in public/. Serving it as a
      // real file (rather than injecting its markup into a React page) keeps its inline
      // <script> executing — scripts added via innerHTML never run — and keeps ~900KB of
      // embedded imagery out of the client JS bundle.
      {
        source: '/landing',
        destination: '/landing.html',
      },
    ]
  }
};

export default nextConfig;
