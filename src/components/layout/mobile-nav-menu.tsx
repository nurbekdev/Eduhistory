"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type NavLink = { href: string; label: string };

export function MobileNavMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  if (links.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden size-10 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Menyuni ochish"
      >
        <Menu className="size-5 text-slate-700 dark:text-slate-300" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[min(20rem,85vw)] flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 md:hidden"
            role="dialog"
            aria-label="Navigatsiya menyusi"
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Menyu</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                onClick={() => setOpen(false)}
                aria-label="Menyuni yopish"
              >
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-auto p-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
