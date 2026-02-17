/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', '@prisma/client-runtime-utils'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@prisma/client')
      config.externals.push('@prisma/client-runtime-utils')
    }
    return config
  },
}

module.exports = nextConfig
