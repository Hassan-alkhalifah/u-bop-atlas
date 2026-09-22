// Best-effort per-client limiter. On serverless platforms memory is per instance, so this caps
// bursts but is not a global quota; put a platform firewall rule in front for hard limits.
const WINDOW_MS = 60_000
const MAX_REQUESTS = 12

const hits = new Map<string, number[]>()

export function checkRateLimit(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent)
    return false
  }
  hits.set(key, [...recent, now])
  if (hits.size > 5000) hits.clear()
  return true
}
