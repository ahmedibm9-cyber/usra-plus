import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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
    icon: "/logo.svg",
    apple: "/logo.svg",
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
  maximumScale: 1,
  userScalable: false,
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
        <link rel="apple-touch-icon" href="/logo.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('usra-theme');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light')}else{document.documentElement.classList.add('light');document.documentElement.classList.remove('dark')}}catch(e){document.documentElement.classList.add('light')}})()`,
          }}
        />
        {/* Chunk load error recovery — auto-reload on ChunkLoadError */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var origError=window.onerror;window.onerror=function(msg,src,line,col,err){if(err&&err.name==='ChunkLoadError'){console.warn('[USRA] ChunkLoadError detected, reloading...');window.location.reload();return true}if(origError)return origError.apply(this,arguments);return false};window.addEventListener('unhandledrejection',function(e){if(e.reason&&e.reason.name==='ChunkLoadError'){console.warn('[USRA] ChunkLoadError in promise, reloading...');e.preventDefault();window.location.reload()}})})()`,
          }}
        />
      </head>
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexSansArabic.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`} suppressHydrationWarning>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
