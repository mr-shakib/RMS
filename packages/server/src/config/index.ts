export const config = {
  port: parseInt(process.env.SERVER_PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: '24h',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: [
    'http://localhost:3000', // Desktop app
    'http://localhost:5000', // PWA
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
  ],
};
