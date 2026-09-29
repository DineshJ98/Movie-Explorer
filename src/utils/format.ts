/**
 * Small display formatters shared by the details page.
 *
 * Each one returns `null` for missing or unusable input rather than a
 * placeholder string, so callers can decide whether to render the field at all
 * instead of printing "N/A" or "undefined".
 */

/** "1999-10-15" -> "1999". Returns null for a missing or malformed date. */
export function formatYear(releaseDate: string | undefined | null): string | null {
  if (!releaseDate) return null
  const year = releaseDate.slice(0, 4)
  return /^\d{4}$/.test(year) ? year : null
}

/** "1999-10-15" -> "15 Oct 1999". Returns null for a missing or malformed date. */
export function formatReleaseDate(releaseDate: string | undefined | null): string | null {
  if (!releaseDate) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(releaseDate)
  if (!match) return null

  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  // Rejects impossible dates that Date would silently roll over, e.g. 2023-02-31.
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** 139 -> "2h 19m". Returns null when the runtime is missing. */
export function formatRuntime(minutes: number | null | undefined): string | null {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return null

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/**
 * 8.437 -> "8.4". Returns null when the movie is unrated.
 *
 * TMDB uses 0 for "no votes yet". Showing "0.0" would read as a genuinely
 * terrible film rather than an absence of data, so that is treated as missing.
 */
export function formatRating(voteAverage: number | undefined | null): string | null {
  if (typeof voteAverage !== 'number' || !Number.isFinite(voteAverage) || voteAverage <= 0) {
    return null
  }
  return voteAverage.toFixed(1)
}

/** 1234 -> "1.2K", 1234567 -> "1.2M". Returns null for a missing count. */
export function formatCount(count: number | undefined | null): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return null

  if (count < 1000) return String(count)
  if (count < 1_000_000) {
    const k = count / 1000
    return `${k < 10 ? k.toFixed(1) : Math.round(k)}K`
  }
  const m = count / 1_000_000
  return `${m < 10 ? m.toFixed(1) : Math.round(m)}M`
}
