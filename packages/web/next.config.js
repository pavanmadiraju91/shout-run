/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@shout/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

module.exports = nextConfig;
