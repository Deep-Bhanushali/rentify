import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Disable image optimization for debugging
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude nodemailer and its dependencies from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        tls: false,
        child_process: false,
      };
    }

    return config;
  },
  serverExternalPackages: ['nodemailer'],
};

export default nextConfig;
