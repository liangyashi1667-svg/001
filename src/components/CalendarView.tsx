import type { WorkItem } from '../types'
import { typeMeta } from '../data/mockData'
import { eachDay, formatDateFull, startOfWeek, todayIso } from '../utils/date'

interface Props {
  items: WorkItem[]
  monthAnchor: string
  onSelect: (id: string) => void
}

const DOW = ['一', '二', '三', '四', '五', '六', '日']

function monthLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
}

function startOfMonth(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(1)
  return formatDateFull(d.toISOString().slice(0, 10))
}

export function CalendarView({ items, monthAnchor, onSelect }: Props) {
  const today = todayIso()
  const monthStart = startOfMonth(monthAnchor)
  const gridStart = startOfWeek(monthStart)
  const days = eachDay(gridStart, 42)
  const month = new Date(monthStart + 'T00:00:00').getMonth()

  const byDay = new Map<string, WorkItem[]>()
  for (const item of items) {
    // put on start date and end date for visibility
    for (const key of [item.startDate, item.endDate]) {
      if (!byDay.has(key)) byDay.set(key, [])
      const list = byDay.get(key)!
      if (!list.find((x) => x.id === item.id)) list.push(item)
    }
  }

  return (
    <div className="calendar">
      <div className="calendar-head">
        <h3>{monthLabel(monthStart)}</h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          显示工作项起止日
        </span>
      </div>
      <div className="calendar-grid">
        {DOW.map((d) => (
          <div key={d} className="calendar-dow">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const d = new Date(day + 'T00:00:00')
          const muted = d.getMonth() !== month
          const events = byDay.get(day) ?? []
          return (
            <div key={day} className={`calendar-cell${muted ? ' muted' : ''}${day === today ? ' today' : ''}`}>
              <div className="day-num">{d.getDate()}</div>
              {events.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="cal-event"
                  style={{
                    borderLeftColor: typeMeta[item.type].color,
                    background: typeMeta[item.type].bg,
                    color: typeMeta[item.type].color,
                  }}
                  onClick={() => onSelect(item.id)}
                  title={item.title}
                >
                  {item.key}
                </button>
              ))}
              {events.length > 3 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
                  +{events.length - 3}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function shiftMonth(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + delta)
  d.setDate(1)
  return formatDateFull(d.toISOString().slice(0, 10))
}
