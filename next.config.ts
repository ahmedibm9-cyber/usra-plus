import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vercel handles its own output format — no standalone needed
  // Local dev / self-hosted can still use standalone if not on Vercel
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  allowedDevOrigins: [
    "preview-chat-b2bb9553-a3af-4c4f-85e4-66d55a722eb6.space-z.ai",
    ".space-z.ai",
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
  ],
};

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
});
