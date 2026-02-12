"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  const onLogout = async () => {
    await signOut({ redirect: false });
    router.push("/kirish");
    router.refresh();
  };

  return (
    <Button type="button" variant="ghost" size="sm" className={className} onClick={() => void onLogout()}>
      Chiqish
    </Button>
  );
}
