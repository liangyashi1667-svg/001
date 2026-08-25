import type { Member, Status, WorkItem } from '../types'
import { kanbanColumns, statusMeta } from '../data/mockData'
import { PriorityBadge, TypeBadge } from './Badges'

interface Props {
  items: WorkItem[]
  memberMap: Record<string, Member>
  onSelect: (id: string) => void
  onStatusChange: (id: string, status: Status) => void
}

export function KanbanView({ items, memberMap, onSelect, onStatusChange }: Props) {
  return (
    <div className="kanban">
      {kanbanColumns.map((status) => {
        const colItems = items.filter((i) => i.status === status)
        const meta = statusMeta[status]
        return (
          <section key={status} className="kanban-col">
            <header className="kanban-col-head">
              <div className="left">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: meta.color,
                    display: 'inline-block',
                  }}
                />
                {meta.label}
              </div>
              <span className="count">{colItems.length}</span>
            </header>
            <div
              className="kanban-list"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('text/work-item')
                if (id) onStatusChange(id, status)
              }}
            >
              {colItems.map((item) => {
                const member = item.assigneeId ? memberMap[item.assigneeId] : undefined
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/work-item', item.id)
                    }}
                    onClick={() => onSelect(item.id)}
                  >
                    <div className="key">{item.key}</div>
                    <div className="title">{item.title}</div>
                    <div className="tag-row" style={{ marginBottom: 10 }}>
                      <TypeBadge type={item.type} />
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <div className="meta">
                      <span className="avatar-row">
                        <span
                          className="avatar"
                          style={{ background: member?.avatarColor ?? '#94A3B8' }}
                        >
                          {member?.initials ?? '?'}
                        </span>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {member?.name ?? '未分配'}
                        </span>
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                        {item.progress}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
