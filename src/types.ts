export interface ProjectNode {
  id: string
  name: string
  date: string
  note?: string
}

export interface Project {
  id: string
  name: string
  startDate: string
  endDate: string
  color: string
  nodes: ProjectNode[]
  sourceLabel?: string
}

export interface RecognizedDraft {
  name: string
  startDate: string
  endDate: string
  nodes: { name: string; date: string; note?: string }[]
  confidence: number
  summary: string
}
