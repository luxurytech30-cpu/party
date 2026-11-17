import path from 'node:path';
import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4001';

// Prevent a deployed frontend from silently proxying requests to its own localhost.
if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.API_URL || !API_URL.startsWith('https://')) {
    throw new Error('Production requires API_URL set to the Render HTTPS origin.');
  }
}

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  async redirects() {
    return [{ source: '/', destination: '/ar', permanent: false }];
  },
  // Proxy the API through the web origin: refresh-token cookie stays first-party
  // (no third-party cookie issues between Vercel and Render).
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
