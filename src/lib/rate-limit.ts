type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120),
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1 };
  }

  if (current.count >= maxRequests) {
    return { success: false, remaining: 0, retryAfterMs: current.resetAt - now };
  }

  current.count += 1;
  buckets.set(key, current);

  return { success: true, remaining: maxRequests - current.count };
}
