/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ystnmtkqnljbkzadxkxu.supabase.co'],
  },
  async rewrites() {
    return [
      {
        source: '/api/predictor/:path*',
        destination: 'http://127.0.0.1:8000/:path*',
      },
      {
        source: '/api/mocktest/:path*',
        destination: 'http://127.0.0.1:8000/mocktest/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

