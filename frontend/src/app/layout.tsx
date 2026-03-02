import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";
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
  title: "Advanced Search Engine - AI-Powered Search & Forms",
  description: "Get accurate, well-researched answers with AI-powered search. Create intelligent forms with advanced analytics. Built with cutting-edge AI technology.",
  keywords: ["AI search", "intelligent search", "form builder", "AI forms", "search engine", "web search"],
  authors: [{ name: "Advanced Search Engine Team" }],
  openGraph: {
    title: "Advanced Search Engine - AI-Powered Search & Forms",
    description: "Get accurate, well-researched answers with AI-powered search. Create intelligent forms in seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-black dark:focus:bg-gray-900 dark:focus:text-white"
          >
            Skip to main content
          </a>
          <Navigation />
          <main id="main-content" role="main">
            {children}
          </main>
          <Toaster 
            position="top-right" 
            richColors 
            closeButton
            toastOptions={{
              style: {
                background: 'var(--glass-background)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--glass-border)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
