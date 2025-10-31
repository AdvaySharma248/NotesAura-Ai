import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NotesAura AI - AI-Powered Study Assistant",
  description: "SmartNotes AI is a modern, AI-powered web app designed for students to upload, summarize, and store their notes, documents, and lecture recordings.",
  keywords: ["NotesAura", "AI", "Study Assistant", "Note Summarization", "Education", "Next.js", "TypeScript"],
  authors: [{ name: "NotesAura AI Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "NotesAura AI - AI-Powered Study Assistant",
    description: "Your AI-powered study assistant for summarizing notes and documents",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NotesAura AI",
    description: "AI-powered study assistant for students",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
