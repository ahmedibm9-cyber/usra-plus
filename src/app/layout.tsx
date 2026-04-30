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
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo.svg" />
      </head>
      <body className={`${inter.variable} ${tajawal.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111117",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#E5E7EB",
            },
          }}
        />
      </body>
    </html>
  );
}
