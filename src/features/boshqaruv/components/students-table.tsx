"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, FileText } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";

type AttemptRow = {
  id: string;
  quizTitle: string;
  isFinal: boolean;
  attemptNumber: number;
  scorePercent: number;
  status: string;
  submittedAt: string | null;
};

type Row = {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userImageUrl: string | null;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastLessonTitle: string | null;
  lastCompletedAt: string | null;
  attemptCount: number;
  quizAvgPercent: number | null;
  attempts: AttemptRow[];
};

function downloadCsv(rows: Row[]) {
  const headers = [
    "Talaba",
    "Email",
    "Kurs",
    "Progress %",
    "Tugallangan darslar",
    "Jami darslar",
    "Quiz urinishlar",
    "Quiz o'rtacha %",
    "Oxirgi dars",
    "Yozilgan sana",
  ];
  const csvRows = rows.map((r) =>
    [
      r.userFullName,
      r.userEmail,
      r.courseTitle,
      r.progressPercent,
      r.completedLessons,
      r.totalLessons,
      r.attemptCount,
      r.quizAvgPercent ?? "",
      r.lastLessonTitle ?? "",
      new Date(r.enrolledAt).toLocaleDateString("uz-UZ"),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `talabalar-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function StudentsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressFilter, setProgressFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/boshqaruv/students?progress=${progressFilter}`);
    if (!res.ok) {
      setRows([]);
      return;
    }
    const data = (await res.json()) as { rows: Row[] };
    setRows(data.rows);
    setLoading(false);
  }, [progressFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SelectNative
          value={progressFilter}
          onChange={(e) => setProgressFilter(e.target.value)}
          className="w-[180px] border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="all">Barchasi</option>
          <option value="in_progress">Davom etmoqda</option>
          <option value="completed">Tugallangan</option>
        </SelectNative>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => downloadCsv(rows)}
          disabled={rows.length === 0}
        >
          <Download className="size-4" />
          CSV export
        </Button>
      </div>

      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Talabalar jadvali</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Yuklanmoqda...</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Ma'lumot topilmadi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600 text-left text-slate-600 dark:text-slate-400">
                    <th className="pb-2 pr-2 font-medium">Talaba</th>
                    <th className="pb-2 pr-2 font-medium">Kurs</th>
                    <th className="pb-2 pr-2 font-medium">Progress</th>
                    <th className="pb-2 pr-2 font-medium">Urinishlar</th>
                    <th className="pb-2 pr-2 font-medium">Quiz o'rt.</th>
                    <th className="pb-2 pr-2 font-medium">Oxirgi dars</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <>
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                      >
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-3">
                            <Avatar src={r.userImageUrl} alt={r.userFullName} size="sm" />
                            <div>
                              <p className="font-medium">{r.userFullName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{r.userEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-2">{r.courseTitle}</td>
                        <td className="py-3 pr-2">
                          <span className="font-medium">{r.progressPercent}%</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {" "}({r.completedLessons}/{r.totalLessons})
                          </span>
                        </td>
                        <td className="py-3 pr-2">{r.attemptCount}</td>
                        <td className="py-3 pr-2">{r.quizAvgPercent != null ? `${r.quizAvgPercent}%` : "—"}</td>
                        <td className="py-3 pr-2">
                          {r.lastLessonTitle ? (
                            <span className="text-slate-600 dark:text-slate-300">{r.lastLessonTitle}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3">
                          {r.attempts.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                            >
                              {expandedId === r.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                            </Button>
                          )}
                        </td>
                      </tr>
                      {expandedId === r.id && r.attempts.length > 0 && (
                        <tr key={`${r.id}-attempts`} className="bg-slate-50 dark:bg-slate-700/30">
                          <td colSpan={7} className="py-3 pr-2">
                            <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
                              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                <FileText className="size-3.5" />
                                Attempt tarixi
                              </p>
                              <ul className="space-y-1 text-xs">
                                {r.attempts.map((a) => (
                                  <li
                                    key={a.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded px-2 py-1.5 text-slate-700 dark:text-slate-300"
                                  >
                                    <span>
                                      {a.quizTitle}
                                      {a.isFinal && (
                                        <Badge variant="locked" className="ml-1 text-[10px]">
                                          Final
                                        </Badge>
                                      )}
                                    </span>
                                    <span>
                                      Urinish #{a.attemptNumber} — {Math.round(a.scorePercent)}%
                                      {a.submittedAt && (
                                        <span className="text-slate-500 dark:text-slate-400">
                                          {" "}
                                          {new Date(a.submittedAt).toLocaleString("uz-UZ")}
                                        </span>
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
