import Link from "next/link";
import { BookOpen, FileCheck, Home, Share2, UserPlus } from "lucide-react";

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90">
      <div className="mx-auto max-w-6xl min-w-0 px-3 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sahifa
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  <Home className="size-4" />
                  Bosh sahifa
                </Link>
              </li>
              <li>
                <Link
                  href="/kurslar"
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  <BookOpen className="size-4" />
                  Kurslar
                </Link>
              </li>
              <li>
                <Link
                  href="/kirish"
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  Kirish
                </Link>
              </li>
              <li>
                <Link
                  href="/royxatdan-otish"
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  <UserPlus className="size-4" />
                  Ro&apos;yxatdan o&apos;tish
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kurslarni ulashish
            </h3>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              Do&apos;stlaringizga kurslar katalogini ulashing.
            </p>
            <Link
              href="/kurslar"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
            >
              <Share2 className="size-4" />
              Kurslar sahifasiga o&apos;tish
            </Link>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sertifikatlarni ulashish
            </h3>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              Sertifikatlaringizni ko&apos;ring va ulashing.
            </p>
            <Link
              href="/sertifikatlar"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <FileCheck className="size-4" />
              Sertifikatlar
            </Link>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Platforma
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Eduhistory — zamonaviy LMS platformasi. Maktab fanlari, IT, robototexnika va 3D modellashtirish kurslari.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 dark:border-slate-700 sm:mt-10 sm:flex-row sm:gap-4 sm:pt-8">
          <p className="text-center text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
            © {currentYear} Eduhistory. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </div>
    </footer>
  );
}
