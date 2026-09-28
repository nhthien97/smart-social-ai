import type { NextConfig } from "next";

// Strip the /api/v1 suffix to get the backend base URL
const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/api\/v1\/?$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/uploads/:path*',
          destination: `${apiBase}/api/v1/uploads/:path*`,
        },
      ],
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'minisocial-api-ldl3.onrender.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
