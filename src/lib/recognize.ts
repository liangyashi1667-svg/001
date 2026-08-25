import type { RecognizedDraft } from '../types'
import { addDays, formatDateFull, todayIso } from './date'

const DATE_RE =
  /(?:(\d{4})[./年-]?)?\s*(\d{1,2})[./月-](\d{1,2})日?/g

const NODE_HINT =
  /(节点|里程碑|阶段|交付|上线|评审|验收|启动|立项|封板|提测|发布|演示|复盘)/

const COLORS = ['#0F766E', '#0369A1', '#B45309', '#BE123C', '#7C3AED', '#15803D']

export function nextColor(index: number): string {
  return COLORS[index % COLORS.length]
}

function normalizeDate(year: string | undefined, month: string, day: string, fallbackYear: number): string | null {
  const y = year ? Number(year) : fallbackYear
  const m = Number(month)
  const d = Number(day)
  if (!y || !m || !d || m > 12 || d > 31) return null
  return formatDateFull(`${y}-${`${m}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`)
}

function extractDates(text: string): string[] {
  const year = new Date().getFullYear()
  const dates: string[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(DATE_RE.source, 'g')
  while ((match = re.exec(text)) !== null) {
    const iso = normalizeDate(match[1], match[2], match[3], year)
    if (iso) dates.push(iso)
  }
  return dates
}

function extractTitle(text: string, fallback: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  for (const line of lines.slice(0, 8)) {
    const m =
      line.match(/(?:项目名称|项目|课题)[:：\s]*(.+)$/) ||
      line.match(/^#\s+(.+)$/) ||
      line.match(/^【(.+?)】/)
    if (m?.[1]) return m[1].replace(/[《》【】]/g, '').trim().slice(0, 40)
  }
  const first = lines[0]?.replace(/^[#*\-\d.\s]+/, '').slice(0, 40)
  return first || fallback
}

function extractNodes(text: string, dates: string[]): RecognizedDraft['nodes'] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const nodes: RecognizedDraft['nodes'] = []
  const year = new Date().getFullYear()

  for (const line of lines) {
    // Skip pure cycle/range lines — they define span, not milestones
    if (/(周期|起止|时间范围|从.+到)/.test(line) && !NODE_HINT.test(line)) continue

    const dateMatches = [...line.matchAll(new RegExp(DATE_RE.source, 'g'))]
    if (dateMatches.length === 0) continue

    const isNodeLine =
      NODE_HINT.test(line) ||
      /^\d{4}/.test(line) ||
      /^[-*•·\d.]/.test(line) ||
      /[：:]\s*\S+/.test(line.replace(DATE_RE, ''))

    if (!isNodeLine) continue

    // Prefer the first date on the line as the node date
    const dm = dateMatches[0]
    const date = normalizeDate(dm[1], dm[2], dm[3], year)
    if (!date) continue

    let name = line
      .replace(new RegExp(DATE_RE.source, 'g'), ' ')
      .replace(/[|｜]/g, ' ')
      .replace(/[-–—:：]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!name || name.length < 2) name = '关键节点'
    name = name.slice(0, 28)
    if (!nodes.find((n) => n.name === name && n.date === date)) {
      nodes.push({ name, date, note: line.slice(0, 80) })
    }
  }

  if (nodes.length === 0 && dates.length > 0) {
    const labels = ['启动', '中期检查', '验收交付']
    dates.slice(0, 5).forEach((date, i) => {
      nodes.push({ name: labels[i] || `节点 ${i + 1}`, date })
    })
  }

  return nodes.sort((a, b) => a.date.localeCompare(b.date))
}

function buildDraft(text: string, fallbackName: string, sourceHint: string): RecognizedDraft {
  const dates = extractDates(text)
  const nodes = extractNodes(text, dates)
  const allDates = [...dates, ...nodes.map((n) => n.date)].sort()
  const startDate = allDates[0] || todayIso()
  const endDate = allDates[allDates.length - 1] || addDays(startDate, 30)
  const name = extractTitle(text, fallbackName)
  const confidence = Math.min(
    0.95,
    0.35 + nodes.length * 0.12 + (dates.length > 0 ? 0.2 : 0) + (text.length > 40 ? 0.1 : 0),
  )

  return {
    name,
    startDate,
    endDate: endDate < startDate ? addDays(startDate, 14) : endDate,
    nodes:
      nodes.length > 0
        ? nodes
        : [
            { name: '项目启动', date: startDate },
            { name: '中期节点', date: addDays(startDate, Math.max(7, Math.floor((daysSpan(startDate, endDate) || 30) / 2))) },
            { name: '验收交付', date: endDate < startDate ? addDays(startDate, 30) : endDate },
          ],
    confidence,
    summary: `已从${sourceHint}识别出 ${nodes.length || 3} 个时间节点，周期 ${startDate} → ${endDate < startDate ? addDays(startDate, 30) : endDate}`,
  }
}

function daysSpan(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
}

/** Parse plain text / markdown / csv-like content */
export function recognizeFromText(text: string, fallbackName = '未命名项目'): RecognizedDraft {
  return buildDraft(text, fallbackName, '文本材料')
}

/** Lightweight image “recognition”: use filename + optional caption, plus common plan templates when no text */
export async function recognizeFromImage(
  file: File,
  caption = '',
): Promise<{ draft: RecognizedDraft; previewUrl: string }> {
  const previewUrl = URL.createObjectURL(file)
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
  const combined = [caption, baseName, await tryReadAsTextHint(file)].filter(Boolean).join('\n')

  // If user provided caption/text with dates, prefer that; otherwise generate a sensible plan scaffold from filename
  const hasDates = extractDates(combined).length > 0 || NODE_HINT.test(combined)
  if (hasDates || caption.trim().length > 10) {
    return {
      draft: buildDraft(combined, baseName || '图片项目', `图片「${file.name}」`),
      previewUrl,
    }
  }

  const start = todayIso()
  const draft: RecognizedDraft = {
    name: baseName || '图片识别项目',
    startDate: start,
    endDate: addDays(start, 42),
    nodes: [
      { name: '需求确认', date: addDays(start, 3), note: '基于图片材料推断' },
      { name: '方案评审', date: addDays(start, 14), note: '基于图片材料推断' },
      { name: '开发联调', date: addDays(start, 28), note: '基于图片材料推断' },
      { name: '上线验收', date: addDays(start, 42), note: '基于图片材料推断' },
    ],
    confidence: 0.55,
    summary: `已读取图片「${file.name}」。未检测到明确日期文字，已生成可编辑的周期草稿，请核对后导入甘特图。`,
  }
  return { draft, previewUrl }
}

async function tryReadAsTextHint(file: File): Promise<string> {
  // Some "images" might actually be mislabeled; skip binary
  if (!file.type.startsWith('text') && file.size > 200_000) return ''
  try {
    const buf = await file.slice(0, 4000).text()
    if (/[\u4e00-\u9fff]|\d{4}[-/.年]/.test(buf)) return buf
  } catch {
    /* ignore */
  }
  return ''
}

export async function recognizeFile(file: File, caption = ''): Promise<{ draft: RecognizedDraft; previewUrl?: string }> {
  const lower = file.name.toLowerCase()
  if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/.test(lower)) {
    return recognizeFromImage(file, caption)
  }
  const text = await file.text()
  return { draft: recognizeFromText(text, file.name.replace(/\.[^.]+$/, '')) }
}

export const sampleMaterial = `项目名称：智慧园区一期
周期：2026-08-01 至 2026-10-15

节点计划：
2026-08-05 立项启动会
2026-08-20 需求评审
2026-09-10 中期联调
2026-09-28 提测
2026-10-15 上线验收
`
