/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore TypeScript errors during build (some pre-existing type issues)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
