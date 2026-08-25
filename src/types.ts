export type WorkItemType = 'requirement' | 'task' | 'bug' | 'milestone'
export type Priority = 'P0' | 'P1' | 'P2' | 'P3'
export type Status =
  | 'backlog'
  | 'planning'
  | 'in_progress'
  | 'review'
  | 'testing'
  | 'done'
  | 'blocked'

export type ViewMode = 'table' | 'kanban' | 'gantt' | 'calendar'
export type GroupBy = 'none' | 'status' | 'assignee' | 'priority' | 'type'

export interface Member {
  id: string
  name: string
  avatarColor: string
  initials: string
}

export interface ProjectSpace {
  id: string
  name: string
  description: string
  color: string
  cycleLabel: string
  cycleStart: string
  cycleEnd: string
}

export interface WorkItem {
  id: string
  key: string
  title: string
  type: WorkItemType
  status: Status
  priority: Priority
  assigneeId: string | null
  projectId: string
  startDate: string
  endDate: string
  progress: number
  tags: string[]
  description: string
  createdAt: string
}

export interface FilterState {
  query: string
  types: WorkItemType[]
  statuses: Status[]
  priorities: Priority[]
  assigneeIds: string[]
}
