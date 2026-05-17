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
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Code splitting optimization
  webpack: (config, { isServer }) => {
    // Reduce bundle size by tree-shaking unused MUI modules
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          mui: {
            name: 'mui',
            test: /[\\/]node_modules[\\/](@mui)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          lucide: {
            name: 'lucide',
            test: /[\\/]node_modules[\\/](lucide-react)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          recharts: {
            name: 'recharts',
            test: /[\\/]node_modules[\\/](recharts)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
        maxInitialRequests: 25,
        minSize: 20000,
      };
    }
    return config;
  },

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
    "21.0.12.243",
  ],
};

export default withSentryConfig(nextConfig, {
  org: 'plus-studios',
  project: 'javascript-nextjs',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: {
    disable: true,
  },
  widenClientFileUpload: true,
  tunnelRoute: '/sentry-tunnel',
  hideSourceMaps: true,
});
