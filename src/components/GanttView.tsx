import type { WorkItem } from '../types'
import { statusMeta, typeMeta } from '../data/mockData'
import { addDays, daysBetween, eachDay, formatDate, startOfWeek, todayIso } from '../utils/date'

interface Props {
  items: WorkItem[]
  cycleStart: string
  cycleEnd: string
  onSelect: (id: string) => void
}

export function GanttView({ items, cycleStart, cycleEnd, onSelect }: Props) {
  const today = todayIso()
  const rangeStart = startOfWeek(cycleStart)
  const span = Math.max(daysBetween(cycleStart, cycleEnd) + 6, 21)
  const days = eachDay(rangeStart, span)
  const dayWidth = 36
  const todayIndex = days.indexOf(today)

  const sorted = [...items].sort((a, b) => a.startDate.localeCompare(b.startDate))

  if (items.length === 0) {
    return <div className="panel empty">当前筛选条件下暂无工作项</div>
  }

  return (
    <div className="panel gantt">
      <div className="gantt-grid">
        <div className="gantt-side">
          <div className="gantt-head">工作项 / 时间线</div>
          {sorted.map((item) => (
            <div key={item.id} className="gantt-row" onClick={() => onSelect(item.id)}>
              <span
                className="badge"
                style={{
                  color: typeMeta[item.type].color,
                  background: typeMeta[item.type].bg,
                }}
              >
                {typeMeta[item.type].label}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{item.key}</div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 650,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 160,
                  }}
                >
                  {item.title}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="gantt-timeline" style={{ position: 'relative' }}>
          <div className="gantt-days" style={{ gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)` }}>
            {days.map((d) => {
              const date = new Date(d + 'T00:00:00')
              const weekend = date.getDay() === 0 || date.getDay() === 6
              return (
                <div
                  key={d}
                  className={`gantt-day${d === today ? ' today' : ''}${weekend ? ' weekend' : ''}`}
                >
                  {formatDate(d).slice(3)}
                </div>
              )
            })}
          </div>

          {sorted.map((item) => {
            const startOffset = daysBetween(rangeStart, item.startDate) - 1
            const duration = daysBetween(item.startDate, item.endDate)
            const left = Math.max(0, startOffset) * dayWidth
            const width = Math.max(1, duration) * dayWidth - 4
            const color = statusMeta[item.status].color

            return (
              <div
                key={item.id}
                className="gantt-track"
                style={{ gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)`, width: days.length * dayWidth }}
              >
                {days.map((d) => (
                  <div key={d} className="cell" />
                ))}
                {todayIndex >= 0 && (
                  <div className="gantt-today-line" style={{ left: todayIndex * dayWidth + dayWidth / 2 }} />
                )}
                <button
                  type="button"
                  className="gantt-bar"
                  style={{ left: left + 2, width, background: color }}
                  title={`${item.title} · ${item.startDate} → ${item.endDate}`}
                  onClick={() => onSelect(item.id)}
                >
                  {item.progress}% · {addDays(item.startDate, 0).slice(5)}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
