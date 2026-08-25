import { useMemo, useState } from 'react'
import type { Project, RecognizedDraft } from './types'
import { nextColor } from './lib/recognize'
import { uid } from './lib/date'
import { MultiProjectGantt, overallRangeLabel } from './components/MultiProjectGantt'
import { RecognizeModal } from './components/RecognizeModal'

const seed: Project[] = [
  {
    id: 'p_demo_1',
    name: '产品体验升级',
    startDate: '2026-08-11',
    endDate: '2026-08-29',
    color: '#0F766E',
    sourceLabel: '示例项目',
    nodes: [
      { id: 'n1', name: '方案评审', date: '2026-08-18' },
      { id: 'n2', name: '联调提测', date: '2026-08-24' },
      { id: 'n3', name: '周期验收', date: '2026-08-29' },
    ],
  },
  {
    id: 'p_demo_2',
    name: '数据中台 M2',
    startDate: '2026-08-01',
    endDate: '2026-09-15',
    color: '#0369A1',
    sourceLabel: '示例项目',
    nodes: [
      { id: 'n4', name: '口径对齐', date: '2026-08-10' },
      { id: 'n5', name: '看板上线', date: '2026-09-01' },
      { id: 'n6', name: '里程碑验收', date: '2026-09-15' },
    ],
  },
]

export default function App() {
  const [projects, setProjects] = useState<Project[]>(seed)
  const [selectedId, setSelectedId] = useState<string | null>(seed[0]?.id ?? null)
  const [openRecognize, setOpenRecognize] = useState(false)

  const selected = projects.find((p) => p.id === selectedId) ?? null
  const rangeLabel = useMemo(() => overallRangeLabel(projects), [projects])
  const nodeCount = useMemo(
    () => projects.reduce((sum, p) => sum + p.nodes.length, 0),
    [projects],
  )

  const importDraft = (draft: RecognizedDraft, sourceLabel: string) => {
    const project: Project = {
      id: uid('p'),
      name: draft.name,
      startDate: draft.startDate,
      endDate: draft.endDate,
      color: nextColor(projects.length),
      sourceLabel,
      nodes: draft.nodes.map((n) => ({
        id: uid('n'),
        name: n.name,
        date: n.date,
        note: n.note,
      })),
    }
    setProjects((prev) => [...prev, project])
    setSelectedId(project.id)
    setOpenRecognize(false)
  }

  const removeSelected = () => {
    if (!selected) return
    setProjects((prev) => prev.filter((p) => p.id !== selected.id))
    setSelectedId(null)
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="mark">G</div>
          <div>
            <h1>节点甘特</h1>
            <p>多项目时间节点 · 材料识别导入</p>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" className="btn ghost" onClick={() => setProjects(seed)}>
            恢复示例
          </button>
          <button type="button" className="btn primary" onClick={() => setOpenRecognize(true)}>
            识别材料导入
          </button>
        </div>
      </header>

      <section className="stats">
        <div className="stat">
          <span>项目数</span>
          <strong>{projects.length}</strong>
        </div>
        <div className="stat">
          <span>节点数</span>
          <strong>{nodeCount}</strong>
        </div>
        <div className="stat wide">
          <span>整体时间范围</span>
          <strong>{rangeLabel}</strong>
        </div>
      </section>

      <section className="workspace">
        <div className="gantt-wrap">
          <div className="section-title">
            <h2>多项目甘特图</h2>
            <span>色条为项目周期，圆点为关键时间节点</span>
          </div>
          <MultiProjectGantt
            projects={projects}
            selectedId={selectedId}
            onSelectProject={setSelectedId}
          />
        </div>

        <aside className="side">
          <div className="section-title">
            <h2>项目详情</h2>
          </div>
          {!selected ? (
            <div className="side-empty">选择甘特图中的项目查看节点</div>
          ) : (
            <div className="side-card">
              <div className="side-head">
                <span className="dot" style={{ background: selected.color }} />
                <div>
                  <h3>{selected.name}</h3>
                  <small>{selected.sourceLabel || '手动导入'}</small>
                </div>
              </div>
              <div className="kv">
                <div>
                  <span>周期</span>
                  <b>
                    {selected.startDate} → {selected.endDate}
                  </b>
                </div>
                <div>
                  <span>节点</span>
                  <b>{selected.nodes.length} 个</b>
                </div>
              </div>
              <ul className="node-list">
                {selected.nodes
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((n) => (
                    <li key={n.id}>
                      <span className="node-date">{n.date}</span>
                      <span className="node-name">{n.name}</span>
                    </li>
                  ))}
              </ul>
              <button type="button" className="btn ghost danger" onClick={removeSelected}>
                移除该项目
              </button>
            </div>
          )}
        </aside>
      </section>

      <RecognizeModal
        open={openRecognize}
        onClose={() => setOpenRecognize(false)}
        onConfirm={importDraft}
      />
    </div>
  )
}
