export function formatDateFull(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayIso(): string {
  return formatDateFull(new Date().toISOString().slice(0, 10))
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return formatDateFull(d.toISOString().slice(0, 10))
}

export function daysBetween(start: string, end: string): number {
  const a = new Date(start + 'T00:00:00').getTime()
  const b = new Date(end + 'T00:00:00').getTime()
  return Math.round((b - a) / 86400000)
}

export function eachDay(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function minDate(dates: string[]): string {
  return dates.reduce((a, b) => (a < b ? a : b))
}

export function maxDate(dates: string[]): string {
  return dates.reduce((a, b) => (a > b ? a : b))
}
