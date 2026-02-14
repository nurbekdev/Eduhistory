"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Role } from "@prisma/client";
import { User, LayoutGrid, BookOpen, Award, Settings, LogOut, Sun, Moon } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { LOCALE_COOKIE } from "@/components/layout/header-actions";
import type { Locale } from "@/lib/i18n/messages";

export type UserMenuLabels = {
  profile: string;
  courses: string;
  myCourses: string;
  certificates: string;
  management: string;
  analytics: string;
  language: string;
  themeSettings: string;
  light: string;
  dark: string;
  langUz: string;
  langEn: string;
  logout: string;
};

type UserMenuDropdownProps = {
  imageUrl: string | null;
  role: Role;
  locale: Locale;
  labels: UserMenuLabels;
};

export function UserMenuDropdown({ imageUrl, role, labels, locale }: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const isManagement = role === Role.ADMIN || role === Role.INSTRUCTOR;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const setLocale = useCallback(
    (l: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000`;
      setOpen(false);
      router.refresh();
    },
    [router]
  );

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full p-0"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menyu"
        aria-expanded={open}
      >
        <Avatar src={imageUrl ?? undefined} alt="" size="sm" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <Link
            href="/profil"
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 md:py-2.5"
            onClick={() => setOpen(false)}
          >
            <User className="size-4 shrink-0 text-slate-500" />
            {labels.profile}
          </Link>
          <Link
            href="/kurslar"
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 md:py-2.5"
            onClick={() => setOpen(false)}
          >
            <LayoutGrid className="size-4 shrink-0 text-slate-500" />
            {labels.courses}
          </Link>
          {!isManagement && (
            <Link
              href="/mening-kurslarim"
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 md:py-2.5"
              onClick={() => setOpen(false)}
            >
              <BookOpen className="size-4 shrink-0 text-slate-500" />
              {labels.myCourses}
            </Link>
          )}
          <Link
            href="/sertifikatlar"
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 md:py-2.5"
            onClick={() => setOpen(false)}
          >
            <Award className="size-4 shrink-0 text-slate-500" />
            {labels.certificates}
          </Link>
          {isManagement && (
            <>
              <Link
                href="/boshqaruv"
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 md:py-2.5"
                onClick={() => setOpen(false)}
              >
                <Settings className="size-4 shrink-0 text-slate-500" />
                {labels.management}
              </Link>
              <Link
                href="/boshqaruv/analitika"
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 md:py-2.5"
                onClick={() => setOpen(false)}
              >
                <LayoutGrid className="size-4 shrink-0 text-slate-500" />
                {labels.analytics}
              </Link>
            </>
          )}
          <div className="my-2 border-t border-slate-100 dark:border-slate-700" />
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-400 md:py-2.5">
            <span className="flex items-center gap-3">
              <Sun className="size-4 shrink-0 text-slate-500" />
              {labels.language}
            </span>
            <div className="flex shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setLocale("uz")}
                className={`rounded px-2 py-0.5 text-xs ${locale === "uz" ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
              >
                {labels.langUz}
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded px-2 py-0.5 text-xs ${locale === "en" ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
              >
                {labels.langEn}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-400 md:py-2.5">
            <span className="flex items-center gap-3">
              {resolvedTheme === "dark" ? <Moon className="size-4 shrink-0 text-slate-500" /> : <Sun className="size-4 shrink-0 text-slate-500" />}
              {labels.themeSettings}
            </span>
            <div className="flex shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`rounded px-2 py-0.5 text-xs ${resolvedTheme === "light" ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
              >
                {labels.light}
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`rounded px-2 py-0.5 text-xs ${resolvedTheme === "dark" ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
              >
                {labels.dark}
              </button>
            </div>
          </div>
          <div className="my-2 border-t border-slate-100 dark:border-slate-700" />
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 md:py-2.5"
            onClick={() => {
              setOpen(false);
              void signOut({ redirect: false }).then(() => {
                router.push("/kirish");
                router.refresh();
              });
            }}
          >
            <LogOut className="size-4 shrink-0 text-slate-500" />
            {labels.logout}
          </button>
        </div>
      )}
    </div>
  );
}
