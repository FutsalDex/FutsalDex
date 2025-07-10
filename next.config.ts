import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      'https://9004-firebase-studio-1748847492158.cluster-3g7bqlotigwuxlqpiut7yq74.cloudworkstations.dev',
      'http://localhost:9004',
    ],
  },
  webpack: (config, { isServer }) => {
    // This optimization helps prevent ChunkLoadError by ensuring shared modules are handled efficiently.
    if (!isServer) {
        config.optimization.splitChunks = {
            chunks: 'all',
        };
    }
    return config;
  },
};

export default nextConfig;
