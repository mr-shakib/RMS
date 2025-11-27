/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next',
  output: 'standalone',
  transpilePackages: ['@rms/shared'],
  images: {
    unoptimized: true,
  },
  // Ensure experimental features for better standalone builds
  experimental: {
    // Include all dependencies in standalone build
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
  webpack: (config, { isServer }) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    
    // Ensure proper handling of server-side modules in standalone build
    if (isServer) {
      // Don't bundle these, they should be in node_modules
      config.externals = [...config.externals, 'canvas', 'sharp'];
    }
    
    return config;
  },
};

module.exports = nextConfig;
