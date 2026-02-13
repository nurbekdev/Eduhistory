"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Send } from "lucide-react";
import { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  title: string;
  body: string;
  targetRole: string;
  createdAt: string;
  createdBy: { fullName: string };
};

type NotificationDropdownProps = {
  userRole: Role;
};

export function NotificationDropdown({ userRole }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTitle, setSendTitle] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = userRole === Role.ADMIN || userRole === Role.INSTRUCTOR;

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = (await res.json()) as Notification[];
    setNotifications(data);
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTitle.trim() || !sendBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sendTitle.trim(),
          body: sendBody.trim(),
          targetRole: "STUDENT",
        }),
      });
      if (!res.ok) throw new Error("Xatolik");
      setSendTitle("");
      setSendBody("");
      setSendOpen(false);
      fetchNotifications();
    } catch {
      alert("Xabar yuborish muvaffaqiyatsiz.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen((o) => !o)}
        aria-label="Bildirishnilar"
      >
        <Bell className="size-5 text-slate-600 dark:text-slate-400" />
        {notifications.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
            {notifications.length > 10 ? "10+" : notifications.length}
          </span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-200 p-2 dark:border-slate-700">
              <p className="px-2 py-1 text-sm font-medium text-slate-900 dark:text-slate-100">Bildirishnilar</p>
              {canSend && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full gap-2"
                  onClick={() => setSendOpen((o) => !o)}
                >
                  <Send className="size-4" />
                  Barcha talabalariga xabar yuborish
                </Button>
              )}
            </div>
            {sendOpen && canSend && (
              <form onSubmit={handleSend} className="border-b border-slate-200 p-3 dark:border-slate-700">
                <input
                  type="text"
                  placeholder="Sarlavha"
                  value={sendTitle}
                  onChange={(e) => setSendTitle(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  maxLength={200}
                />
                <textarea
                  placeholder="Xabar matni"
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  rows={3}
                  maxLength={2000}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={sending || !sendTitle.trim() || !sendBody.trim()}>
                    {sending ? "Yuborilmoqda..." : "Yuborish"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSendOpen(false)}>
                    Bekor
                  </Button>
                </div>
              </form>
            )}
            <div className="max-h-[280px] overflow-y-auto">
              {loading ? (
                <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">Yuklanmoqda...</p>
              ) : notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">Bildirishnilar yo'q.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {notifications.slice(0, 20).map((n) => (
                    <li key={n.id} className="p-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{n.body}</p>
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                        {n.createdBy.fullName} · {new Date(n.createdAt).toLocaleDateString("uz-UZ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
