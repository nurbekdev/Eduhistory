"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; fullName: string };
};

type ReviewsResponse = {
  reviews: ReviewItem[];
  total: number;
  page: number;
  limit: number;
  averageRating: number | null;
  totalReviews: number;
};

async function fetchReviews(courseId: string, page = 1): Promise<ReviewsResponse> {
  const res = await fetch(`/api/courses/${courseId}/reviews?page=${page}&limit=10`);
  if (!res.ok) throw new Error("Izohlarni yuklashda xatolik.");
  return res.json();
}

async function submitReview(courseId: string, data: { rating: number; comment?: string }) {
  const res = await fetch(`/api/courses/${courseId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json()) as { message?: string };
    throw new Error(body.message ?? "Baho saqlanmadi.");
  }
  return res.json();
}

export function CourseReviewsSection({
  courseId,
  isEnrolled,
}: {
  courseId: string;
  isEnrolled: boolean;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["course-reviews", courseId, page],
    queryFn: () => fetchReviews(courseId, page),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { rating: number; comment?: string }) => submitReview(courseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-reviews", courseId] });
      setComment("");
      setRating(0);
      toast.success("Baho va izoh saqlandi.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const displayRating = hoverRating || rating;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <Card className="dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 dark:text-slate-100">
          <Star className="size-5 text-amber-500" />
          Reyting va izohlar
          {data?.averageRating != null && (
            <span className="text-base font-normal text-slate-500 dark:text-slate-400">
              {data.averageRating.toFixed(1)} ({data.totalReviews} ta baho)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEnrolled && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Kursga baho bering</p>
            <div className="mb-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="rounded p-1 transition hover:scale-110"
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(value)}
                  aria-label={`${value} yulduz`}
                >
                  <Star
                    className={`size-8 ${
                      value <= displayRating
                        ? "fill-amber-500 text-amber-500"
                        : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Izoh (ixtiyoriy)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              className="mb-3 min-h-[80px] dark:bg-slate-800 dark:text-slate-100"
            />
            <Button
              disabled={rating < 1 || submitMutation.isPending}
              onClick={() => submitMutation.mutate({ rating, comment: comment.trim() || undefined })}
            >
              {submitMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Izohlar yuklanmoqda...</p>
        ) : !data?.reviews?.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Hozircha hech kim baho qoldirmagan.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {data.reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{r.user.fullName}</span>
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {r.rating}
                      <Star className="size-4 fill-current" />
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString("uz-UZ")}
                  </p>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Oldingi
                </Button>
                <span className="flex items-center px-2 text-sm text-slate-600 dark:text-slate-400">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Keyingi
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
