"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type RequestItem = {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
  };
};

export function InstructorRequestsTable({
  initialRequests,
}: {
  initialRequests: RequestItem[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      fetch(`/api/admin/instructor-requests/${requestId}/approve`, { method: "POST" }),
    onSuccess: async (_, requestId) => {
      toast.success("Ustoz tasdiqlandi.");
      queryClient.invalidateQueries({ queryKey: ["admin-instructor-requests"] });
      router.refresh();
    },
    onError: () => toast.error("Xatolik yuz berdi."),
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) =>
      fetch(`/api/admin/instructor-requests/${requestId}/reject`, { method: "POST" }),
    onSuccess: async () => {
      toast.success("So'rov rad etildi.");
      queryClient.invalidateQueries({ queryKey: ["admin-instructor-requests"] });
      router.refresh();
    },
    onError: () => toast.error("Xatolik yuz berdi."),
  });

  if (initialRequests.length === 0) {
    return (
      <Card className="dark:border-slate-700">
        <CardContent className="p-8 text-center text-slate-600 dark:text-slate-400">
          Hozircha kutilayotgan ustoz so'rovlari yo'q.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:border-slate-700">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  F.I.SH
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  So'rov sanasi
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                  Amallar
                </th>
              </tr>
            </thead>
            <tbody>
              {initialRequests.map((req) => (
                <tr
                  key={req.id}
                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {req.user.fullName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {req.user.email}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {new Date(req.createdAt).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        Tasdiqlash
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        Rad etish
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
