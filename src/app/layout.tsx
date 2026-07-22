import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  title: "SecOps",
  description: "Multi-tenant SOC platform — SIEM, SOAR, CTI, EDR, DFIR, VM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Hard-coded dark theme, not a next-themes toggle: the UI spec (Figures 1-4) is a
  // dedicated dark SOC console with no light-mode mockup or toggle control anywhere in it.
  // next-themes is still installed (shadcn init pulled it in) if a real toggle is wanted
  // later — swap this for a ThemeProvider + suppressHydrationWarning at that point.
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
