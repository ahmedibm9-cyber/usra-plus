import type { Metadata, Viewport } from "next";
import { Inter, Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const tajawal = Tajawal({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "USRA PLUS - Your Family Operating System",
  description: "Premium family coordination and household management platform. Manage tasks, calendars, groceries, and more — together.",
  keywords: ["USRA PLUS", "family", "coordination", "management", "tasks", "calendar", "grocery", "SaaS"],
  authors: [{ name: "USRA PLUS" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "USRA PLUS - Your Family Operating System",
    description: "Premium family coordination and household management platform",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366F1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('usra-theme');if(t==='light'){document.documentElement.classList.add('light');document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark');document.documentElement.classList.remove('light')}}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
        {/* Chunk load error recovery — auto-reload on ChunkLoadError */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var origError=window.onerror;window.onerror=function(msg,src,line,col,err){if(err&&err.name==='ChunkLoadError'){console.warn('[USRA] ChunkLoadError detected, reloading...');window.location.reload();return true}if(origError)return origError.apply(this,arguments);return false};window.addEventListener('unhandledrejection',function(e){if(e.reason&&e.reason.name==='ChunkLoadError'){console.warn('[USRA] ChunkLoadError in promise, reloading...');e.preventDefault();window.location.reload()}})})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${tajawal.variable} antialiased bg-background text-foreground`} suppressHydrationWarning>
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
      </body>
    </html>
  );
}
