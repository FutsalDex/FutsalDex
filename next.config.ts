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
  // --- Nueva configuración para permitir solicitudes cross-origin en desarrollo ---
  experimental: {
    allowedDevOrigins: [
      'https://9004-firebase-studio-1748847492158.cluster-3g7bqlotigwuxlqpiut7yq74.cloudworkstations.dev',
      'http://localhost:9004', // Para acceso local desde el navegador del entorno
      'http://10.88.0.3:9004' // Para la IP interna que Next.js también muestra
    ],
  },
  // --- Fin de la nueva configuración ---
};

export default nextConfig;
