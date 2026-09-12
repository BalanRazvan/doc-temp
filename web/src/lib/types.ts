export type Procedure = {
  id: string
  name: string
}

export type TimelineVisit = {
  visitNumber: number
  week: number
  window: number
  procedures: string[]
}

export type Visit = {
  visitNumber: number
  week: number
  window: number
  targetDate: string
  actualDate?: string
  note?: string
  procedures: string[]
}

export type Timeline = {
  id: string
  user_id: string
  name: string
  color: string | null
  visits: TimelineVisit[]
  procedures: Procedure[]
  created_at: string
}

export type Patient = {
  id: string
  user_id: string
  name: string
  anchor_date: string
  source_timeline_id: string | null
  visits: Visit[]
  procedures: Procedure[]
  note: string | null
  created_at: string
}

export type ProcedureSet = {
  id: string
  user_id: string
  name: string
  procedures: string[]
  created_at: string
}

export type SavedArticle = {
  id: string
  user_id: string
  source: string
  external_id: string
  title: string
  authors: string | null
  journal: string | null
  year: number | null
  abstract: string | null
  url: string | null
  note: string | null
  saved_at: string
}
