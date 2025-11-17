/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next',
  transpilePackages: ['@rms/shared'],
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

module.exports = nextConfig;
