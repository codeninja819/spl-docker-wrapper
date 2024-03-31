/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  env: {
    RPC_URL: process.env.RPC_URL,
    NFT_STORAGE_API_KEY: process.env.NFT_STORAGE_API_KEY,
    },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false , assert: false, os: false, crypto: false, stream: false}
    return config
  }
};
