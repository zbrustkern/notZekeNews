/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure native modules like better-sqlite3 are handled in server-only context
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
