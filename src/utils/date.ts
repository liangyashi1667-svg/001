export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${m}-${day}`
}

export function formatDateFull(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
}

export function daysBetween(start: string, end: string): number {
  const a = new Date(start + 'T00:00:00').getTime()
  const b = new Date(end + 'T00:00:00').getTime()
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return formatDateFull(d.toISOString().slice(0, 10))
}

export function startOfWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return formatDateFull(d.toISOString().slice(0, 10))
}

export function eachDay(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

export function todayIso(): string {
  return formatDateFull(new Date().toISOString().slice(0, 10))
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function uid(prefix = 'w'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}
