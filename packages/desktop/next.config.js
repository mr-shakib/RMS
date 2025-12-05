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
  // This ensures the standalone build traces files back to the monorepo root
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
};

module.exports = nextConfig;
