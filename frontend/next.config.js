/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_NAME: 'Ultimate Voice Bridge',
    NEXT_PUBLIC_API_URL: 'http://localhost:8000',
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
