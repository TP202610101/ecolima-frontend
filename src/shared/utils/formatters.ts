/** Formats a numeric metric rounding to integer with locale separators. */
export function formatMetric(v: number | null | undefined, suffix = ''): string {
  if (v == null) return '—'
  const n = Math.round(v).toLocaleString('es-PE')
  return suffix ? `${n} ${suffix}` : n
}

/** Formats a distance in meters, converting to km when >= 1000. */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return '—'
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`
}
