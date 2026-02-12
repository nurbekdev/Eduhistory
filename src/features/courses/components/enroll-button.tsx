"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type EnrollButtonProps = {
  courseId: string;
  initiallyEnrolled: boolean;
};

export function EnrollButton({ courseId, initiallyEnrolled }: EnrollButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(initiallyEnrolled);

  const onEnroll = async () => {
    setIsLoading(true);
    const response = await fetch("/api/enrollments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId }),
    });
    setIsLoading(false);

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      if (response.status === 401) {
        router.push("/kirish");
        return;
      }
      toast.error(body.message ?? "Kursga yozilishda xatolik yuz berdi.");
      return;
    }

    setIsEnrolled(true);
    toast.success("Kursga muvaffaqiyatli yozildingiz.");
    router.refresh();
  };

  if (isEnrolled) {
    return (
      <Button asChild>
        <a href={`/player/${courseId}`}>Kursni davom ettirish</a>
      </Button>
    );
  }

  return (
    <Button onClick={onEnroll} disabled={isLoading}>
      {isLoading ? "Yozilmoqda..." : "Kursga yozilish"}
    </Button>
  );
}
