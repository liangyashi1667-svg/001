import type { Member, Status, WorkItem, WorkItemType, Priority } from '../types'
import { priorityMeta, statusMeta, typeMeta } from '../data/mockData'

export function StatusBadge({ status }: { status: Status }) {
  const meta = statusMeta[status]
  return (
    <span className="badge" style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  )
}

export function TypeBadge({ type }: { type: WorkItemType }) {
  const meta = typeMeta[type]
  return (
    <span className="badge" style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = priorityMeta[priority]
  return (
    <span className="badge" style={{ color: meta.color, background: `${meta.color}14` }}>
      {meta.label}
    </span>
  )
}

export function Avatar({ member }: { member: Member | undefined }) {
  if (!member) {
    return (
      <span className="avatar-row">
        <span className="avatar" style={{ background: '#94A3B8' }}>
          ?
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>未分配</span>
      </span>
    )
  }
  return (
    <span className="avatar-row">
      <span className="avatar" style={{ background: member.avatarColor }}>
        {member.initials}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{member.name}</span>
    </span>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-mini">
      <div className="bar">
        <span style={{ width: `${value}%` }} />
      </div>
      <span className="pct">{value}%</span>
    </div>
  )
}

export function WorkItemKey({ item }: { item: WorkItem }) {
  return (
    <div className="cell-title">
      <span className="key">{item.key}</span>
      <span className="name">{item.title}</span>
    </div>
  )
}
