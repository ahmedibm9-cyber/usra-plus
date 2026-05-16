import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import MuiThemeWrapper from "@/components/providers/mui-theme-wrapper";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["arabic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-metric",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "USRA PLUS — Your Family Operating System",
  description: "Premium family coordination and household management platform. Manage tasks, calendars, groceries, and more — together.",
  keywords: ["USRA PLUS", "family", "coordination", "management", "tasks", "calendar", "grocery", "SaaS"],
  authors: [{ name: "USRA PLUS" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-new.png",
    apple: "/logo-new.png",
  },
  openGraph: {
    title: "USRA PLUS — Your Family Operating System",
    description: "Premium family coordination and household management platform",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0D6B58",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="light" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo-new.png" />
        {/*
          CSP Compliance: External scripts instead of dangerouslySetInnerHTML.
          These must run synchronously before React hydration:
          - theme-init.js: Prevents FOUC by applying theme class before paint
          - chunk-error-recovery.js: Auto-reloads on ChunkLoadError after deployments
          When implementing nonce-based CSP, add nonce prop to these <script> tags.
        */}
        <script src="/scripts/theme-init.js" />
        <script src="/scripts/chunk-error-recovery.js" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexSansArabic.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <MuiThemeWrapper>{children}</MuiThemeWrapper>
      </body>
    </html>
  );
}
