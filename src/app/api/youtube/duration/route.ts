import { NextResponse } from "next/server";

import { extractYoutubeVideoId } from "@/lib/youtube";

/** Parse ISO 8601 duration (e.g. PT4M13S, PT1H2M10S) to total minutes (rounded up). */
function parseIso8601Duration(iso: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const totalMinutes = hours * 60 + minutes + Math.ceil(seconds / 60);
  return Math.max(0, totalMinutes);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const videoIdParam = searchParams.get("videoId");

  let videoId: string | null = videoIdParam ?? null;
  if (!videoId && url) {
    videoId = extractYoutubeVideoId(url);
  }

  if (!videoId) {
    return NextResponse.json({ durationMinutes: null, error: "Video ID topilmadi." });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ durationMinutes: null, error: "YouTube API kaliti sozlanmagan." });
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${encodeURIComponent(videoId)}&key=${apiKey}`,
    );
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({
        durationMinutes: null,
        error: `YouTube API xatosi: ${res.status}`,
      });
    }
    const data = (await res.json()) as {
      items?: Array<{ contentDetails?: { duration?: string } }>;
    };
    const duration = data.items?.[0]?.contentDetails?.duration;
    if (!duration) {
      return NextResponse.json({ durationMinutes: null, error: "Video topilmadi." });
    }
    const durationMinutes = parseIso8601Duration(duration);
    return NextResponse.json({ durationMinutes });
  } catch (e) {
    console.error("YouTube duration fetch error:", e);
    return NextResponse.json({
      durationMinutes: null,
      error: "Davomiylik olishda xatolik.",
    });
  }
}
