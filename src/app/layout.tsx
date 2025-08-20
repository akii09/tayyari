import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { HeaderDock } from "@/components/shell/HeaderDock";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TayyariAI — Smarter Prep. Faster Progress.",
  description: "Modern, minimal, next‑gen AI preparation platform.",
  icons: {
    icon: "/img/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]`}>
        <div className="min-h-screen flex flex-col">
          <HeaderDock />
          <main className="flex-1 pt-20 sm:pt-24">{children}</main>
          <footer className="border-t border-white/5 text-center text-xs text-[var(--text-secondary)] py-4">© {new Date().getFullYear()} TayyariAI</footer>
        </div>
      </body>
    </html>
  );
}
