import type { Project } from '../types'
import { addDays, daysBetween, eachDay, maxDate, minDate, todayIso } from '../lib/date'

interface Props {
  projects: Project[]
  onSelectProject?: (id: string) => void
  selectedId?: string | null
}

export function MultiProjectGantt({ projects, onSelectProject, selectedId }: Props) {
  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <h2>还没有项目</h2>
        <p>点击「识别材料导入」，上传项目计划、截图或粘贴文本，自动识别周期与节点并生成甘特图。</p>
      </div>
    )
  }

  const allDates = projects.flatMap((p) => [
    p.startDate,
    p.endDate,
    ...p.nodes.map((n) => n.date),
  ])
  const rangeStart = addDays(minDate(allDates), -2)
  const rangeEnd = addDays(maxDate(allDates), 3)
  const span = Math.max(daysBetween(rangeStart, rangeEnd) + 1, 14)
  const days = eachDay(rangeStart, span)
  const dayWidth = span > 60 ? 22 : span > 40 ? 28 : 34
  const today = todayIso()
  const todayIndex = days.indexOf(today)

  return (
    <div className="gantt-panel">
      <div className="gantt-layout" style={{ minWidth: 220 + days.length * dayWidth }}>
        <div className="gantt-labels">
          <div className="gantt-corner">项目 / 节点</div>
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`gantt-label-row${selectedId === p.id ? ' active' : ''}`}
              onClick={() => onSelectProject?.(p.id)}
            >
              <span className="dot" style={{ background: p.color }} />
              <span className="meta">
                <strong>{p.name}</strong>
                <small>
                  {p.startDate} → {p.endDate} · {p.nodes.length} 节点
                </small>
              </span>
            </button>
          ))}
        </div>

        <div className="gantt-chart">
          <div className="gantt-days" style={{ gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)` }}>
            {days.map((d) => {
              const date = new Date(d + 'T00:00:00')
              const showLabel = date.getDate() === 1 || d === days[0] || d === today
              const weekend = date.getDay() === 0 || date.getDay() === 6
              return (
                <div
                  key={d}
                  className={`gantt-day${d === today ? ' today' : ''}${weekend ? ' weekend' : ''}`}
                  title={d}
                >
                  {showLabel ? formatMonthDay(d) : ''}
                </div>
              )
            })}
          </div>

          {projects.map((p) => {
            const barStart = Math.max(0, daysBetween(rangeStart, p.startDate))
            const barDays = Math.max(1, daysBetween(p.startDate, p.endDate) + 1)
            return (
              <div
                key={p.id}
                className={`gantt-track${selectedId === p.id ? ' active' : ''}`}
                style={{ width: days.length * dayWidth }}
                onClick={() => onSelectProject?.(p.id)}
              >
                <div
                  className="gantt-grid-bg"
                  style={{ gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)` }}
                >
                  {days.map((d) => (
                    <div key={d} className="cell" />
                  ))}
                </div>

                {todayIndex >= 0 && (
                  <div className="today-line" style={{ left: todayIndex * dayWidth + dayWidth / 2 }} />
                )}

                <div
                  className="gantt-bar"
                  style={{
                    left: barStart * dayWidth + 2,
                    width: barDays * dayWidth - 4,
                    background: `${p.color}33`,
                    borderColor: p.color,
                  }}
                  title={`${p.name} 周期`}
                />

                {p.nodes.map((node) => {
                  const idx = daysBetween(rangeStart, node.date)
                  if (idx < 0 || idx >= days.length) return null
                  return (
                    <div
                      key={node.id}
                      className="gantt-node"
                      style={{ left: idx * dayWidth + dayWidth / 2, background: p.color }}
                      title={`${node.name}\n${node.date}${node.note ? `\n${node.note}` : ''}`}
                    >
                      <span className="node-label">{node.name}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatMonthDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function overallRangeLabel(projects: Project[]): string {
  if (!projects.length) return '—'
  const dates = projects.flatMap((p) => [p.startDate, p.endDate, ...p.nodes.map((n) => n.date)])
  return `${minDate(dates)} → ${maxDate(dates)}`
}
