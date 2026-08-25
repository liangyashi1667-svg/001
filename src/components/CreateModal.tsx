import { useState } from 'react'
import type { Member, Priority, WorkItemType } from '../types'
import { priorityMeta, typeMeta } from '../data/mockData'
import { todayIso, addDays } from '../utils/date'

export interface CreatePayload {
  title: string
  type: WorkItemType
  priority: Priority
  assigneeId: string | null
  startDate: string
  endDate: string
  description: string
}

interface Props {
  members: Member[]
  onClose: () => void
  onCreate: (payload: CreatePayload) => void
}

export function CreateModal({ members, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<WorkItemType>('task')
  const [priority, setPriority] = useState<Priority>('P1')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(addDays(todayIso(), 5))
  const [description, setDescription] = useState('')

  const submit = () => {
    if (!title.trim()) return
    onCreate({
      title: title.trim(),
      type,
      priority,
      assigneeId: assigneeId || null,
      startDate,
      endDate,
      description,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="新建工作项">
        <header className="modal-head">
          <h2>新建工作项</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="modal-body">
          <div className="field">
            <label>标题</label>
            <input
              autoFocus
              placeholder="例如：完成周期评审材料"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>类型</label>
              <select value={type} onChange={(e) => setType(e.target.value as WorkItemType)}>
                {(Object.keys(typeMeta) as WorkItemType[]).map((t) => (
                  <option key={t} value={t}>
                    {typeMeta[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>优先级</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {(Object.keys(priorityMeta) as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {priorityMeta[p].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>负责人</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">未分配</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <div className="field">
              <label>开始日期</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field">
              <label>结束日期</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>描述</label>
            <textarea
              placeholder="补充背景、验收标准或依赖说明"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!title.trim()}>
            创建
          </button>
        </footer>
      </div>
    </div>
  )
}
