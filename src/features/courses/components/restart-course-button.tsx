"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function RestartCourseButton({
  enrollmentId,
  courseId,
}: {
  enrollmentId: string;
  courseId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRestart = async () => {
    if (!confirm("Kursni qayta boshlash barcha progress va sertifikatni o'chiradi. Davom etasizmi?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/me/enrollments/${enrollmentId}/restart`, { method: "POST" });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok) {
        toast.error(data.message ?? "Xatolik yuz berdi.");
        return;
      }
      toast.success("Kurs qayta boshlandi.");
      router.push(`/player/${courseId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full sm:w-auto"
      onClick={handleRestart}
      disabled={loading}
    >
      <RotateCcw className="mr-2 size-4" />
      {loading ? "Boshlanmoqda..." : "Qaytdan boshlash"}
    </Button>
  );
}
