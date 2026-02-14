import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { Footer } from "@/components/layout/footer";
import { MainHeader } from "@/components/layout/main-header";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/messages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eduhistory.uz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Eduhistory — Zamonaviy LMS platformasi",
    template: "%s | Eduhistory",
  },
  description:
    "Eduhistory — maktab fanlari, IT, robototexnika va 3D modellashtirish kurslari uchun professional o'quv platformasi. Kurslar, testlar, sertifikatlar.",
  keywords: ["LMS", "o'quv platformasi", "kurslar", "Eduhistory", "ta'lim", "sertifikat", "IT", "robototexnika"],
  authors: [{ name: "Nurbek Po'latov", url: siteUrl }],
  creator: "Nurbek Po'latov",
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: siteUrl,
    siteName: "Eduhistory",
    title: "Eduhistory — Zamonaviy LMS platformasi",
    description: "Maktab fanlari, IT, robototexnika va 3D modellashtirish kurslari. Bepul ro'yxatdan o'ting.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eduhistory — Zamonaviy LMS",
    description: "Kurslar, testlar, sertifikatlar — bitta platformada.",
  },
  icons: {
    icon: "/eduhistory-logo.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("eduhistory-locale")?.value as Locale) ?? "uz";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Eduhistory",
    url: siteUrl,
    description: "Zamonaviy LMS platformasi — maktab fanlari, IT, robototexnika va 3D modellashtirish kurslari.",
    founder: { "@type": "Person", name: "Nurbek Po'latov" },
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AppProviders>
          <div
            className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            suppressHydrationWarning
          >
            <Suspense
              fallback={
                <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/80 shadow-sm backdrop-blur-xl">
                  <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6" />
                </header>
              }
            >
              <MainHeader locale={locale} />
            </Suspense>
            <main className="flex-1">
              <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
            </main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}

