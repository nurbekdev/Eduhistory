import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { MainHeader } from "@/components/layout/main-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Eduhistory",
    template: "%s | Eduhistory",
  },
  description: "Eduhistory - maktab fanlari, IT, robototexnika va 3D modellashtirish kurslari uchun LMS platforma",
  icons: {
    icon: "/eduhistory-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          <div className="min-h-screen bg-slate-50">
            <MainHeader />
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
