const YOUTUBE_EMBED_BASE = "https://www.youtube-nocookie.com/embed";

export function extractYoutubeVideoId(input: string) {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ?? null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "embed" || pathParts[0] === "shorts") {
        return pathParts[1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function toYoutubeEmbedUrl(input: string) {
  const id = extractYoutubeVideoId(input);
  if (!id) return input;
  return `${YOUTUBE_EMBED_BASE}/${id}`;
}
