import { useRef, useState } from 'react'
import type { RecognizedDraft } from '../types'
import { recognizeFile, recognizeFromText, sampleMaterial } from '../lib/recognize'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (draft: RecognizedDraft, sourceLabel: string) => void
}

type Step = 'upload' | 'result'

export function RecognizeModal({ open, onClose, onConfirm }: Props) {
  const fileRef = useRef<File | null>(null)
  const [step, setStep] = useState<Step>('upload')
  const [text, setText] = useState('')
  const [caption, setCaption] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [draft, setDraft] = useState<RecognizedDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setStep('upload')
    setText('')
    setCaption('')
    setFileName(null)
    setDraft(null)
    setError('')
    setBusy(false)
    fileRef.current = null
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  if (!open) return null

  const onFile = async (file: File | null) => {
    if (!file) return
    fileRef.current = file
    setFileName(file.name)
    setError('')
    if (file.type.startsWith('image/')) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
    } else {
      try {
        const content = await file.text()
        setText(content.slice(0, 8000))
      } catch {
        setError('无法读取该文件，请改用文本粘贴')
      }
    }
  }

  const runRecognize = async () => {
    setBusy(true)
    setError('')
    try {
      await new Promise((r) => setTimeout(r, 400))
      if (fileRef.current) {
        const result = await recognizeFile(fileRef.current, caption || text)
        if (result.previewUrl) {
          setPreviewUrl((prev) => {
            if (prev && prev !== result.previewUrl) URL.revokeObjectURL(prev)
            return result.previewUrl ?? null
          })
        }
        setDraft(result.draft)
      } else if (text.trim()) {
        setDraft(recognizeFromText(text.trim()))
      } else {
        setError('请先粘贴文本或上传材料')
        return
      }
      setStep('result')
    } catch {
      setError('识别失败，请换一份材料重试')
    } finally {
      setBusy(false)
    }
  }

  const updateNode = (index: number, patch: Partial<RecognizedDraft['nodes'][number]>) => {
    if (!draft) return
    setDraft({
      ...draft,
      nodes: draft.nodes.map((n, i) => (i === index ? { ...n, ...patch } : n)),
    })
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        reset()
        onClose()
      }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="材料识别">
        <header className="modal-head">
          <div>
            <h2>识别项目材料</h2>
            <p>支持图片、文本、Markdown、CSV；识别周期与节点后导入甘特图</p>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            关闭
          </button>
        </header>

        {step === 'upload' && (
          <div className="modal-body">
            <label
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                void onFile(e.dataTransfer.files?.[0] ?? null)
              }}
            >
              <input
                type="file"
                accept="image/*,.txt,.md,.csv,.json,.log"
                hidden
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
              <strong>拖拽或点击上传项目材料</strong>
              <span>计划表截图、节点清单、Markdown / TXT / CSV</span>
              {fileName && <em>已选择：{fileName}</em>}
            </label>

            {previewUrl && (
              <div className="preview-box">
                <img src={previewUrl} alt="材料预览" />
              </div>
            )}

            <div className="field">
              <label htmlFor="material-text">粘贴文本材料（或图片补充说明）</label>
              <textarea
                id="material-text"
                rows={8}
                placeholder={
                  '例如：\n项目名称：智慧园区一期\n2026-08-05 立项启动\n2026-09-10 中期联调\n2026-10-15 验收'
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            {fileName?.match(/\.(png|jpe?g|gif|webp|bmp)$/i) && (
              <div className="field">
                <label htmlFor="img-caption">图片补充说明（可选）</label>
                <input
                  id="img-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="例如：周期 8 月到 10 月，含评审、提测、上线"
                />
              </div>
            )}

            {error && <div className="error-tip">{error}</div>}

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setText(sampleMaterial)
                  setFileName(null)
                  fileRef.current = null
                }}
              >
                填入示例
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={(!text.trim() && !fileName) || busy}
                onClick={() => void runRecognize()}
              >
                {busy ? '识别中…' : '开始识别'}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && draft && (
          <div className="modal-body">
            <div className="result-banner">
              <div>
                <strong>识别完成</strong>
                <p>{draft.summary}</p>
              </div>
              <span className="confidence">置信度 {Math.round(draft.confidence * 100)}%</span>
            </div>

            {previewUrl && (
              <div className="preview-box compact">
                <img src={previewUrl} alt="材料预览" />
              </div>
            )}

            <div className="field-row">
              <div className="field grow">
                <label>项目名称</label>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="field">
                <label>开始</label>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>结束</label>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="nodes-editor">
              <div className="nodes-head">
                <span className="field-label">时间节点</span>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      nodes: [...draft.nodes, { name: '新节点', date: draft.endDate }],
                    })
                  }
                >
                  + 节点
                </button>
              </div>
              {draft.nodes.map((node, index) => (
                <div key={index} className="node-row">
                  <input
                    value={node.name}
                    onChange={(e) => updateNode(index, { name: e.target.value })}
                    placeholder="节点名称"
                  />
                  <input
                    type="date"
                    value={node.date}
                    onChange={(e) => updateNode(index, { date: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        nodes: draft.nodes.filter((_, i) => i !== index),
                      })
                    }
                  >
                    删
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setStep('upload')}>
                返回重识
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  onConfirm(draft, fileName ? `材料：${fileName}` : '文本粘贴')
                  reset()
                }}
              >
                导入甘特图
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
