import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow access to dev server from external IP
  allowedDevOrigins: [
    '[your-dimain-or-ip]',
    'http://[your-dimain-or-ip]',
    'http://[your-dimain-or-ip]:3000',
  ],
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,         // Check file changes every second, helpful for VM/remote server
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  turbopack: {}
};


export default nextConfig;
