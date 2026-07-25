import type { Metadata } from "next";
import { Syne, DM_Sans, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlas Search — AI answers with sources you can trust",
  description:
    "Ask anything and get researched answers with citations, trust scores, and intelligent forms — built for clarity, not noise.",
  keywords: [
    "AI search",
    "intelligent search",
    "citations",
    "form builder",
    "search engine",
  ],
  authors: [{ name: "Atlas Search" }],
  openGraph: {
    title: "Atlas Search — AI answers with sources you can trust",
    description:
      "Researched answers with citations, trust scores, and intelligent forms.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <body
        className={`${syne.variable} ${dmSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:px-4 focus:py-2 focus:bg-white focus:text-[var(--ink)] focus:shadow-md"
          >
            Skip to main content
          </a>
          <Navigation />
          <main
            id="main-content"
            role="main"
            className="relative min-h-screen pt-16"
          >
            {children}
          </main>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "var(--surface)",
                backdropFilter: "blur(10px)",
                border: "1px solid var(--surface-border)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
