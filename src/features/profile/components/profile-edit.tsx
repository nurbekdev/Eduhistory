"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Role } from "@prisma/client";

type ProfileEditProps = {
  imageUrl: string | null;
  fullName: string;
  role: Role;
  instructorProfile: {
    bio: string | null;
    workplace: string | null;
    linkedinUrl: string | null;
  } | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
};

export function ProfileEdit({
  imageUrl: initialImageUrl,
  fullName: initialFullName,
  role,
  instructorProfile,
  githubUrl: _githubUrl,
  linkedinUrl: _linkedinUrl,
}: ProfileEditProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [fullName, setFullName] = useState(initialFullName);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingInstructor, setSavingInstructor] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [bio, setBio] = useState(instructorProfile?.bio ?? "");
  const [workplace, setWorkplace] = useState(instructorProfile?.workplace ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(instructorProfile?.linkedinUrl ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isInstructor = role === Role.INSTRUCTOR || role === Role.ADMIN;

  const saveFullName = async () => {
    const name = fullName.trim();
    if (!name || name === initialFullName) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name }),
      });
      if (!res.ok) throw new Error("Ism-familiya yangilanmadi.");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Xatolik.");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "err", text: "Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "err", text: "Yangi parol va tasdiq mos kelmadi." });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setPasswordMessage({ type: "err", text: data.message ?? "Xatolik." });
        return;
      }
      setPasswordMessage({ type: "ok", text: "Parol muvaffaqiyatli yangilandi." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (err) {
      setPasswordMessage({ type: "err", text: "Xatolik yuz berdi." });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "avatars");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Yuklash muvaffaqiyatsiz.");
      }
      const { fileUrl } = (await res.json()) as { fileUrl: string };
      const patchRes = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: fileUrl }),
      });
      if (!patchRes.ok) throw new Error("Profil yangilanmadi.");
      setImageUrl(fileUrl);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const saveInstructorProfile = async () => {
    if (!isInstructor) return;
    setSavingInstructor(true);
    try {
      const res = await fetch("/api/me/instructor-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio || null,
          workplace: workplace || null,
          linkedinUrl: linkedinUrl || null,
        }),
      });
      if (!res.ok) throw new Error("Ustoz profili yangilanmadi.");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    } finally {
      setSavingInstructor(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ism-familiya</CardTitle>
          <CardDescription>Shaxsiy ma'lumotlaringizni o'zgartiring.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ism Familiya"
              className="flex-1"
            />
            <Button onClick={saveFullName} disabled={savingProfile || fullName.trim() === initialFullName} className="gap-2 sm:w-auto">
              {savingProfile && <Loader2 className="size-4 animate-spin" />}
              Saqlash
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil rasmi</CardTitle>
          <CardDescription>Barcha foydalanuvchilar profil rasmini yuklashi mumkin.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="relative size-24 overflow-hidden rounded-full border-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
              {imageUrl ? (
                imageUrl.startsWith("http") || imageUrl.startsWith("/uploads/") ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                )
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400 dark:text-slate-500">
                  {fullName.charAt(0)}
                </span>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 className="size-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Camera className="size-4" />
              {imageUrl ? "Rasmni almashtirish" : "Rasm yuklash"}
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              JPG, PNG yoki WebP. Maksimum 50 MB.
            </p>
          </div>
        </CardContent>
      </Card>

      {isInstructor && (
        <Card>
          <CardHeader>
            <CardTitle>Ustoz profili (landing sahifada)</CardTitle>
            <CardDescription>
              Ism, ish joyi va LinkedIn landingdagi &quot;Bizning ustozlar&quot; bo&apos;limida ko&apos;rsatiladi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="workplace" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Ish joyi (qisqacha)
              </label>
              <Input
                id="workplace"
                placeholder="Masalan: Software Engineer @ Google"
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                O&apos;zingiz haqida (qisqacha)
              </label>
              <textarea
                id="bio"
                rows={3}
                placeholder="Qisqacha tavsif..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="flex w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="linkedin" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                LinkedIn profil havolasi
              </label>
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
            <Button onClick={saveInstructorProfile} disabled={savingInstructor} className="gap-2">
              {savingInstructor && <Loader2 className="size-4 animate-spin" />}
              Saqlash
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Parolni o'zgartirish</CardTitle>
          <CardDescription>Joriy parolni kiriting va yangi parol belgilang.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Joriy parol
              </label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Yangi parol
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kamida 8 ta belgi"
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Yangi parol (tasdiq)
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
              />
            </div>
            {passwordMessage && (
              <p className={passwordMessage.type === "ok" ? "text-sm text-emerald-600 dark:text-emerald-400" : "text-sm text-red-600 dark:text-red-400"}>
                {passwordMessage.text}
              </p>
            )}
            <Button type="submit" disabled={savingPassword} className="gap-2">
              {savingPassword && <Loader2 className="size-4 animate-spin" />}
              Parolni yangilash
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
