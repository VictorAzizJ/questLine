/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@questline/ui", "@questline/game-logic", "@questline/types"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
