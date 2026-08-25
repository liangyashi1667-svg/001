import { Fragment } from 'react'
import type { GroupBy, Member, WorkItem } from '../types'
import { members, priorityMeta, statusMeta, typeMeta } from '../data/mockData'
import { formatDate } from '../utils/date'
import { Avatar, PriorityBadge, ProgressBar, StatusBadge, TypeBadge, WorkItemKey } from './Badges'

interface Props {
  items: WorkItem[]
  groupBy: GroupBy
  selectedId: string | null
  onSelect: (id: string) => void
  memberMap: Record<string, Member>
}

function groupLabel(groupBy: GroupBy, key: string): string {
  if (groupBy === 'status') return statusMeta[key]?.label ?? key
  if (groupBy === 'priority') return priorityMeta[key]?.label ?? key
  if (groupBy === 'type') return typeMeta[key]?.label ?? key
  if (groupBy === 'assignee') {
    if (key === 'none') return '未分配'
    return members.find((m) => m.id === key)?.name ?? key
  }
  return key
}

function groupItems(items: WorkItem[], groupBy: GroupBy): [string, WorkItem[]][] {
  if (groupBy === 'none') return [['全部工作项', items]]
  const map = new Map<string, WorkItem[]>()
  for (const item of items) {
    let key = 'none'
    if (groupBy === 'status') key = item.status
    if (groupBy === 'priority') key = item.priority
    if (groupBy === 'type') key = item.type
    if (groupBy === 'assignee') key = item.assigneeId ?? 'none'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
}

export function TableView({ items, groupBy, selectedId, onSelect, memberMap }: Props) {
  const groups = groupItems(items, groupBy)

  if (items.length === 0) {
    return <div className="panel empty">当前筛选条件下暂无工作项</div>
  }

  return (
    <div className="panel table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 280 }}>工作项</th>
            <th>类型</th>
            <th>状态</th>
            <th>优先级</th>
            <th>负责人</th>
            <th>周期</th>
            <th>进度</th>
            <th>标签</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([key, rows]) => (
            <Fragment key={key}>
              {groupBy !== 'none' && (
                <tr className="group-header">
                  <td colSpan={8}>
                    {groupLabel(groupBy, key)} · {rows.length}
                  </td>
                </tr>
              )}
              {rows.map((item) => (
                <tr
                  key={item.id}
                  className={selectedId === item.id ? 'selected' : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  <td>
                    <WorkItemKey item={item} />
                  </td>
                  <td>
                    <TypeBadge type={item.type} />
                  </td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td>
                    <Avatar member={item.assigneeId ? memberMap[item.assigneeId] : undefined} />
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {formatDate(item.startDate)} → {formatDate(item.endDate)}
                  </td>
                  <td>
                    <ProgressBar value={item.progress} />
                  </td>
                  <td>
                    <div className="tag-row">
                      {item.tags.map((tag) => (
                        <span key={tag} className="tag" style={{ background: '#EEF4F1', color: '#4A5C54' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
