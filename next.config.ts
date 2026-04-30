import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-b2bb9553-a3af-4c4f-85e4-66d55a722eb6.space-z.ai",
    ".space-z.ai",
    "localhost",
  ],
};

export default nextConfig;
