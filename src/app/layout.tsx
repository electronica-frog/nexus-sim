import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXUS Sim v2 — Multi-Agent AI Simulation",
  description: "Sistema de simulacion multi-agente con oleadas colaborativas, trust networks, memoria profunda y auto-mejora continua.",
  keywords: ["NEXUS", "AI", "Multi-Agent", "Simulation", "Neural Network", "Auto-Improvement"],
  authors: [{ name: "NEXUS Team" }],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "NEXUS Sim v2",
    description: "Multi-Agent AI Simulation System with autonomous self-improvement",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXUS Sim v2",
    description: "Multi-Agent AI Simulation System",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
