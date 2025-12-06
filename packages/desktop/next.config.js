/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next',
  output: 'standalone',
  transpilePackages: ['@rms/shared'],
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
  // Disable all SSR and static generation
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    
    if (isServer) {
      config.externals = [...config.externals, 'canvas', 'sharp'];
    }
    
    return config;
  },
};

module.exports = nextConfig;
