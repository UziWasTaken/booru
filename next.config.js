/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'shxpeyjwjjlbqfoclqgu.supabase.co'
    ]
  },
  output: 'standalone',
  // Add this to ensure proper routing
  trailingSlash: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/html'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 