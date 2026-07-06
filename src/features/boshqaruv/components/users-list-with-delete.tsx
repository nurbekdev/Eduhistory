"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Role } from "@prisma/client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  imageUrl: string | null;
  enrollmentsCount: number;
  coursesCreatedCount: number;
};

function roleLabel(role: string) {
  if (role === Role.ADMIN) return "Admin";
  if (role === Role.INSTRUCTOR) return "Ustoz";
  return "Talaba";
}

async function fetchUsers(roleFilter: string): Promise<UserRow[]> {
  const url = roleFilter === "all" ? "/api/admin/users" : `/api/admin/users?role=${roleFilter}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Foydalanuvchilarni yuklashda xatolik yuz berdi.");
  }
  return res.json();
}

export function UsersListWithDelete() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const query = useQuery({
    queryKey: ["admin-users", roleFilter],
    queryFn: () => fetchUsers(roleFilter),
    staleTime: 10_000,
  });

  const users = query.data ?? [];

  const deleteUser = async (userId: string, fullName: string) => {
    if (!confirm(`"${fullName}" ni rostdan ham o'chirishni xohlaysizmi? Barcha ma'lumotlari yo'qoladi.`)) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      alert(data.message ?? "Xatolik.");
      return;
    }
    queryClient.setQueryData<UserRow[]>(["admin-users", roleFilter], (prev) => prev?.filter((u) => u.id !== userId) ?? []);
    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SelectNative
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-[160px] border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="all">Barchasi</option>
          <option value="STUDENT">Talabalar</option>
          <option value="INSTRUCTOR">Ustozlar</option>
          <option value="ADMIN">Adminlar</option>
        </SelectNative>
      </div>

      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Ro'yxat</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Yuklanmoqda...</p>
          ) : query.isError ? (
            <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{query.error.message}</p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Foydalanuvchi yo'q.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600 text-left text-slate-600 dark:text-slate-400">
                    <th className="pb-2 pr-2 font-medium">Ism</th>
                    <th className="pb-2 pr-2 font-medium">Email</th>
                    <th className="pb-2 pr-2 font-medium">Rol</th>
                    <th className="pb-2 pr-2 font-medium">Kurslar</th>
                    <th className="pb-2 pr-2 font-medium">Yozilishlar</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.imageUrl} alt={u.fullName} size="sm" />
                          <span className="font-medium">{u.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="py-3 pr-2">
                        <Badge variant="locked">{roleLabel(u.role)}</Badge>
                      </td>
                      <td className="py-3 pr-2">{u.coursesCreatedCount}</td>
                      <td className="py-3 pr-2">{u.enrollmentsCount}</td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                          onClick={() => deleteUser(u.id, u.fullName)}
                          title="O'chirish"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
