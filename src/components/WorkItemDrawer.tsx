import type { Member, Priority, Status, WorkItem, WorkItemType } from '../types'
import { priorityMeta, statusMeta, typeMeta } from '../data/mockData'

interface Props {
  item: WorkItem
  members: Member[]
  onClose: () => void
  onChange: (patch: Partial<WorkItem>) => void
  onDelete: () => void
}

export function WorkItemDrawer({ item, members, onClose, onChange, onDelete }: Props) {
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="工作项详情">
        <header className="drawer-head">
          <div>
            <span className="badge" style={{ color: typeMeta[item.type].color, background: typeMeta[item.type].bg }}>
              {typeMeta[item.type].label}
            </span>
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{item.key}</div>
            <h2>{item.title}</h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="关闭">
            关闭
          </button>
        </header>

        <div className="drawer-body">
          <div className="field">
            <label>标题</label>
            <input value={item.title} onChange={(e) => onChange({ title: e.target.value })} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>类型</label>
              <select
                value={item.type}
                onChange={(e) => onChange({ type: e.target.value as WorkItemType })}
              >
                {(Object.keys(typeMeta) as WorkItemType[]).map((t) => (
                  <option key={t} value={t}>
                    {typeMeta[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>状态</label>
              <select
                value={item.status}
                onChange={(e) => onChange({ status: e.target.value as Status })}
              >
                {(Object.keys(statusMeta) as Status[]).map((s) => (
                  <option key={s} value={s}>
                    {statusMeta[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>优先级</label>
              <select
                value={item.priority}
                onChange={(e) => onChange({ priority: e.target.value as Priority })}
              >
                {(Object.keys(priorityMeta) as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {priorityMeta[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>负责人</label>
              <select
                value={item.assigneeId ?? ''}
                onChange={(e) => onChange({ assigneeId: e.target.value || null })}
              >
                <option value="">未分配</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>开始日期</label>
              <input
                type="date"
                value={item.startDate}
                onChange={(e) => onChange({ startDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>结束日期</label>
              <input
                type="date"
                value={item.endDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label>进度 {item.progress}%</label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={item.progress}
              onChange={(e) => onChange({ progress: Number(e.target.value) })}
            />
          </div>

          <div className="field">
            <label>描述</label>
            <textarea
              value={item.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>

          <div className="field">
            <label>标签（逗号分隔）</label>
            <input
              value={item.tags.join(', ')}
              onChange={(e) =>
                onChange({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>

        <footer className="drawer-foot">
          <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={onDelete}>
            删除
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            完成
          </button>
        </footer>
      </aside>
    </>
  )
}
