import { useMemo, useState } from 'react'
import {
  initialWorkItems,
  members,
  spaces,
} from './data/mockData'
import type { GroupBy, Status, ViewMode, WorkItem } from './types'
import { uid } from './utils/date'
import { TableView } from './components/TableView'
import { KanbanView } from './components/KanbanView'
import { GanttView } from './components/GanttView'
import { CalendarView, shiftMonth } from './components/CalendarView'
import { WorkItemDrawer } from './components/WorkItemDrawer'
import { CreateModal, type CreatePayload } from './components/CreateModal'

const viewOptions: { id: ViewMode; label: string }[] = [
  { id: 'table', label: '表格' },
  { id: 'kanban', label: '看板' },
  { id: 'gantt', label: '甘特' },
  { id: 'calendar', label: '日历' },
]

function cycleProgress(spaceId: string, items: WorkItem[]): number {
  const list = items.filter((i) => i.projectId === spaceId)
  if (list.length === 0) return 0
  return Math.round(list.reduce((sum, i) => sum + i.progress, 0) / list.length)
}

export default function App() {
  const [projectId, setProjectId] = useState(spaces[0].id)
  const [items, setItems] = useState<WorkItem[]>(initialWorkItems)
  const [view, setView] = useState<ViewMode>('table')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [monthAnchor, setMonthAnchor] = useState(spaces[0].cycleStart)

  const space = spaces.find((s) => s.id === projectId) ?? spaces[0]
  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [],
  )

  const projectItems = useMemo(
    () => items.filter((i) => i.projectId === projectId),
    [items, projectId],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projectItems
    return projectItems.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.key.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [projectItems, query])

  const selected = items.find((i) => i.id === selectedId) ?? null

  const counts = useMemo(() => {
    const total = projectItems.length
    const done = projectItems.filter((i) => i.status === 'done').length
    const blocked = projectItems.filter((i) => i.status === 'blocked').length
    const active = projectItems.filter((i) =>
      ['in_progress', 'review', 'testing'].includes(i.status),
    ).length
    return { total, done, blocked, active }
  }, [projectItems])

  const progress = cycleProgress(projectId, items)

  const updateItem = (id: string, patch: Partial<WorkItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  const createItem = (payload: CreatePayload) => {
    const prefix = space.name.slice(0, 2).toUpperCase() || 'CB'
    const next: WorkItem = {
      id: uid('w'),
      key: `${prefix}-${100 + items.length}`,
      title: payload.title,
      type: payload.type,
      status: 'backlog',
      priority: payload.priority,
      assigneeId: payload.assigneeId,
      projectId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      progress: 0,
      tags: ['新建'],
      description: payload.description,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    setItems((prev) => [next, ...prev])
    setShowCreate(false)
    setSelectedId(next.id)
  }

  const spaceCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of spaces) {
      map[s.id] = items.filter((i) => i.projectId === s.id).length
    }
    return map
  }, [items])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div className="brand-text">
            <span className="brand-name">CycleBoard</span>
            <span className="brand-sub">项目周期多维管理</span>
          </div>
        </div>

        <div>
          <div className="side-section-title">项目空间</div>
          <div className="space-list">
            {spaces.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`space-item${projectId === s.id ? ' active' : ''}`}
                onClick={() => {
                  setProjectId(s.id)
                  setSelectedId(null)
                  setMonthAnchor(s.cycleStart)
                }}
              >
                <span className="space-dot" style={{ background: s.color }} />
                <span className="space-meta">
                  <div className="space-name">{s.name}</div>
                  <div className="space-cycle">{s.cycleLabel}</div>
                </span>
                <span className="space-count">{spaceCounts[s.id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="cycle-card">
          <h3>{space.cycleLabel}</h3>
          <p>
            {space.cycleStart} → {space.cycleEnd}
            <br />
            {space.description}
          </p>
          <div className="cycle-progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="cycle-stats">
            <span>周期进度 {progress}%</span>
            <span>
              {counts.done}/{counts.total} 完成
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">{space.name}</h1>
            <span className="topbar-desc">{space.description}</span>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setView('gantt')}>
              查看周期
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + 新建工作项
            </button>
          </div>
        </header>

        <div className="toolbar">
          <div className="view-switch" role="tablist" aria-label="视图切换">
            {viewOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={view === opt.id}
                className={view === opt.id ? 'active' : undefined}
                onClick={() => setView(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="toolbar-right">
            <label className="search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="#7A8D84" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="#7A8D84" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                placeholder="搜索标题、编号、标签"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            {view === 'table' && (
              <select
                className="select-chip"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                aria-label="分组"
              >
                <option value="none">不分组</option>
                <option value="status">按状态</option>
                <option value="assignee">按负责人</option>
                <option value="priority">按优先级</option>
                <option value="type">按类型</option>
              </select>
            )}

            {view === 'calendar' && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setMonthAnchor((m: string) => shiftMonth(m, -1))}
                >
                  上月
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setMonthAnchor((m: string) => shiftMonth(m, 1))}
                >
                  下月
                </button>
              </>
            )}
          </div>
        </div>

        <div className="content">
          <div className="summary-strip">
            <div className="summary-item">
              <div className="label">工作项</div>
              <div className="value">{counts.total}</div>
              <div className="hint">本周期全部条目</div>
            </div>
            <div className="summary-item">
              <div className="label">推进中</div>
              <div className="value">{counts.active}</div>
              <div className="hint">进行 / 评审 / 测试</div>
            </div>
            <div className="summary-item">
              <div className="label">已完成</div>
              <div className="value">{counts.done}</div>
              <div className="hint">完成率 {counts.total ? Math.round((counts.done / counts.total) * 100) : 0}%</div>
            </div>
            <div className="summary-item">
              <div className="label">阻塞</div>
              <div className="value" style={{ color: counts.blocked ? 'var(--danger)' : undefined }}>
                {counts.blocked}
              </div>
              <div className="hint">需优先解阻</div>
            </div>
          </div>

          {view === 'table' && (
            <TableView
              items={filtered}
              groupBy={groupBy}
              selectedId={selectedId}
              onSelect={setSelectedId}
              memberMap={memberMap}
            />
          )}
          {view === 'kanban' && (
            <KanbanView
              items={filtered}
              memberMap={memberMap}
              onSelect={setSelectedId}
              onStatusChange={(id, status: Status) => updateItem(id, { status })}
            />
          )}
          {view === 'gantt' && (
            <GanttView
              items={filtered}
              cycleStart={space.cycleStart}
              cycleEnd={space.cycleEnd}
              onSelect={setSelectedId}
            />
          )}
          {view === 'calendar' && (
            <CalendarView items={filtered} monthAnchor={monthAnchor} onSelect={setSelectedId} />
          )}
        </div>
      </main>

      {selected && (
        <WorkItemDrawer
          item={selected}
          members={members}
          onClose={() => setSelectedId(null)}
          onChange={(patch) => updateItem(selected.id, patch)}
          onDelete={() => {
            setItems((prev) => prev.filter((i) => i.id !== selected.id))
            setSelectedId(null)
          }}
        />
      )}

      {showCreate && (
        <CreateModal
          members={members}
          onClose={() => setShowCreate(false)}
          onCreate={createItem}
        />
      )}
    </div>
  )
}
