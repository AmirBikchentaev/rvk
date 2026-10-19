import type { NextConfig } from "next";

const apiProxy = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  transpilePackages: ['@villa/shared'],
  output: 'standalone',
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiProxy}/api/:path*` }];
  },
};

export default nextConfig;
