import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { HeaderDock } from "@/components/shell/HeaderDock";
import { ProgressiveEnhancementProvider } from "@/components/ui/ProgressiveEnhancement";
import { NotificationProvider } from "@/components/ui/NotificationSystem";
import { AccessibilityEnhancer } from "@/components/ui/AccessibilityEnhancer";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { APP_METADATA, SEO_TEMPLATES, getCopyright } from "@/lib/config/metadata";
import "./globals.css";

// Initialize database on app startup
if (typeof window === 'undefined') {
  // Only run on server side
  import("@/lib/database/config").then(({ initializeDatabase }) => {
    initializeDatabase();
  }).catch(console.error);
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: SEO_TEMPLATES.default.title,
  description: SEO_TEMPLATES.default.description,
  keywords: SEO_TEMPLATES.default.keywords,
  icons: {
    icon: "/img/favicon.png",
  },
  openGraph: {
    title: SEO_TEMPLATES.default.title,
    description: SEO_TEMPLATES.default.description,
    url: APP_METADATA.url,
    siteName: APP_METADATA.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_TEMPLATES.default.title,
    description: SEO_TEMPLATES.default.description,
    creator: APP_METADATA.contact.twitter,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
              <body 
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-bg-primary text-text-primary`}
          suppressHydrationWarning={true}
        >
        <AuthProvider>
          <ProgressiveEnhancementProvider>
            <NotificationProvider>
              <AccessibilityEnhancer>
                <div className="min-h-screen flex flex-col">
                  <HeaderDock />
                  <main className="flex-1">{children}</main>
                  <footer className="border-t border-white/5 text-center text-xs text-[var(--text-secondary)] py-4">{getCopyright()}</footer>
                </div>
              </AccessibilityEnhancer>
            </NotificationProvider>
          </ProgressiveEnhancementProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
