import { parseISO, toISO } from './schedule.ts'
import type {
  BackupPatient,
  BackupProcedureSet,
  BackupSavedArticle,
  BackupTimeline,
  Patient,
  Procedure,
  ProcedureSet,
  SavedArticle,
  Timeline,
  TimelineVisit,
  Visit,
} from './types.ts'

export type BackupFile = {
  version: number
  exportedAt: string
  timelines: BackupTimeline[]
  patients: BackupPatient[]
  procedureSets: BackupProcedureSet[]
  savedArticles: BackupSavedArticle[]
}

export type ImportRows = {
  timelines: BackupTimeline[]
  patients: BackupPatient[]
  procedureSets: BackupProcedureSet[]
  savedArticles: BackupSavedArticle[]
}

export function buildBackup(
  timelines: Timeline[],
  patients: Patient[],
  procedureSets: ProcedureSet[],
  savedArticles: SavedArticle[],
  exportedAt: string,
): BackupFile {
  return {
    version: 1,
    exportedAt,
    timelines: timelines.map((timeline) => ({
      id: timeline.id,
      name: timeline.name,
      color: timeline.color,
      visits: timeline.visits,
      procedures: timeline.procedures,
      created_at: timeline.created_at,
    })),
    patients: patients.map((patient) => ({
      name: patient.name,
      anchor_date: patient.anchor_date,
      source_timeline_id: patient.source_timeline_id,
      visits: patient.visits,
      procedures: patient.procedures,
      note: patient.note,
      created_at: patient.created_at,
    })),
    procedureSets: procedureSets.map((procedureSet) => ({
      name: procedureSet.name,
      procedures: procedureSet.procedures,
      created_at: procedureSet.created_at,
    })),
    savedArticles: savedArticles.map((article) => ({
      source: article.source,
      external_id: article.external_id,
      title: article.title,
      authors: article.authors,
      journal: article.journal,
      year: article.year,
      abstract: article.abstract,
      url: article.url,
      note: article.note,
      saved_at: article.saved_at,
    })),
  }
}

function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined
  return (value as { [key: string]: unknown })[key]
}

function date(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  if (toISO(parseISO(value)) !== value) return null
  return value
}

function time(value: unknown): string | null {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null
  return value
}

function readStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const read: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return null
    read.push(item)
  }
  return read
}

function readProcedures(value: unknown): Procedure[] | null {
  if (!Array.isArray(value)) return null
  const read: Procedure[] = []
  for (const procedure of value) {
    const id = field(procedure, 'id')
    const name = field(procedure, 'name')
    if (typeof id !== 'string' || typeof name !== 'string') return null
    read.push({ id, name })
  }
  return read
}

function readTimelineVisit(value: unknown): TimelineVisit | null {
  const visitNumber = field(value, 'visitNumber')
  const week = field(value, 'week')
  const window = field(value, 'window')
  const procedures = readStrings(field(value, 'procedures'))
  if (typeof visitNumber !== 'number' || typeof week !== 'number' || typeof window !== 'number') return null
  if (procedures === null) return null
  return { visitNumber, week, window, procedures }
}

function readTimelineVisits(value: unknown): TimelineVisit[] | null {
  if (!Array.isArray(value)) return null
  const read: TimelineVisit[] = []
  for (const item of value) {
    const visit = readTimelineVisit(item)
    if (visit === null) return null
    read.push(visit)
  }
  return read
}

function readPatientVisit(value: unknown): Visit | null {
  const visit = readTimelineVisit(value)
  const targetDate = date(field(value, 'targetDate'))
  const actualDate = field(value, 'actualDate')
  const note = field(value, 'note')
  if (visit === null || targetDate === null) return null
  const read: Visit = { ...visit, targetDate }
  if (actualDate !== undefined) {
    const attended = date(actualDate)
    if (attended === null) return null
    read.actualDate = attended
  }
  if (note !== undefined) {
    if (typeof note !== 'string') return null
    read.note = note
  }
  return read
}

function readPatientVisits(value: unknown): Visit[] | null {
  if (!Array.isArray(value)) return null
  const read: Visit[] = []
  for (const item of value) {
    const visit = readPatientVisit(item)
    if (visit === null) return null
    read.push(visit)
  }
  return read
}

function readTimeline(value: unknown): BackupTimeline | string {
  const id = field(value, 'id')
  const name = field(value, 'name')
  const color = field(value, 'color')
  const visits = readTimelineVisits(field(value, 'visits'))
  const procedures = readProcedures(field(value, 'procedures'))
  const createdAt = time(field(value, 'created_at'))
  if (typeof id !== 'string') return 'has no id'
  if (typeof name !== 'string') return 'has no name'
  if (color !== null && typeof color !== 'string') return 'has a colour that is not text'
  if (visits === null) return 'has visits that cannot be read'
  if (procedures === null) return 'has procedures that cannot be read'
  if (createdAt === null) return 'has no valid creation time'
  return { id, name, color, visits, procedures, created_at: createdAt }
}

function readPatient(value: unknown): BackupPatient | string {
  const name = field(value, 'name')
  const anchorDate = date(field(value, 'anchor_date'))
  const timelineId = field(value, 'source_timeline_id')
  const visits = readPatientVisits(field(value, 'visits'))
  const procedures = readProcedures(field(value, 'procedures'))
  const note = field(value, 'note')
  const createdAt = time(field(value, 'created_at'))
  if (typeof name !== 'string') return 'has no name'
  if (anchorDate === null) return 'has no valid anchor date'
  if (timelineId !== null && typeof timelineId !== 'string') return 'has a timeline id that is not text'
  if (visits === null) return 'has visits that cannot be read'
  if (procedures === null) return 'has procedures that cannot be read'
  if (note !== null && typeof note !== 'string') return 'has a note that is not text'
  if (createdAt === null) return 'has no valid creation time'
  return {
    name,
    anchor_date: anchorDate,
    source_timeline_id: timelineId,
    visits,
    procedures,
    note,
    created_at: createdAt,
  }
}

function readProcedureSet(value: unknown): BackupProcedureSet | string {
  const name = field(value, 'name')
  const procedures = readStrings(field(value, 'procedures'))
  const createdAt = time(field(value, 'created_at'))
  if (typeof name !== 'string') return 'has no name'
  if (procedures === null) return 'has procedures that cannot be read'
  if (createdAt === null) return 'has no valid creation time'
  return { name, procedures, created_at: createdAt }
}

function readSavedArticle(value: unknown): BackupSavedArticle | string {
  const source = field(value, 'source')
  const externalId = field(value, 'external_id')
  const title = field(value, 'title')
  const authors = field(value, 'authors')
  const journal = field(value, 'journal')
  const year = field(value, 'year')
  const abstract = field(value, 'abstract')
  const url = field(value, 'url')
  const note = field(value, 'note')
  const savedAt = time(field(value, 'saved_at'))
  if (typeof source !== 'string' || typeof externalId !== 'string') return 'has no source and id'
  if (typeof title !== 'string') return 'has no title'
  if (authors !== null && typeof authors !== 'string') return 'has authors that are not text'
  if (journal !== null && typeof journal !== 'string') return 'has a journal that is not text'
  if (year !== null && (typeof year !== 'number' || !Number.isInteger(year))) return 'has a year that is not a whole number'
  if (abstract !== null && typeof abstract !== 'string') return 'has an abstract that is not text'
  if (url !== null && typeof url !== 'string') return 'has a link that is not text'
  if (note !== null && typeof note !== 'string') return 'has a note that is not text'
  if (savedAt === null) return 'has no valid time it was saved'
  return {
    source,
    external_id: externalId,
    title,
    authors,
    journal,
    year,
    abstract,
    url,
    note,
    saved_at: savedAt,
  }
}

export function readBackup(value: unknown): BackupFile | string {
  const version = field(value, 'version')
  const exportedAt = date(field(value, 'exportedAt'))
  const timelineRows = field(value, 'timelines')
  const patientRows = field(value, 'patients')
  const procedureSetRows = field(value, 'procedureSets')
  const savedArticleRows = field(value, 'savedArticles')
  if (typeof version !== 'number') return 'This file is not a backup made by this app.'
  if (version !== 1) return `This backup is version ${version}, and this app reads only version 1.`
  if (exportedAt === null) return 'The backup has no valid export date.'
  if (!Array.isArray(timelineRows)) return 'The backup has no list of timelines.'
  if (!Array.isArray(patientRows)) return 'The backup has no list of patients.'
  if (!Array.isArray(procedureSetRows)) return 'The backup has no list of procedure sets.'
  if (!Array.isArray(savedArticleRows)) return 'The backup has no list of saved articles.'

  const timelines: BackupTimeline[] = []
  for (let index = 0; index < timelineRows.length; index++) {
    const timeline = readTimeline(timelineRows[index])
    if (typeof timeline === 'string') return `Timeline ${index + 1} ${timeline}.`
    timelines.push(timeline)
  }

  const patients: BackupPatient[] = []
  for (let index = 0; index < patientRows.length; index++) {
    const patient = readPatient(patientRows[index])
    if (typeof patient === 'string') return `Patient ${index + 1} ${patient}.`
    patients.push(patient)
  }

  const procedureSets: BackupProcedureSet[] = []
  for (let index = 0; index < procedureSetRows.length; index++) {
    const procedureSet = readProcedureSet(procedureSetRows[index])
    if (typeof procedureSet === 'string') return `Procedure set ${index + 1} ${procedureSet}.`
    procedureSets.push(procedureSet)
  }

  const savedArticles: BackupSavedArticle[] = []
  for (let index = 0; index < savedArticleRows.length; index++) {
    const article = readSavedArticle(savedArticleRows[index])
    if (typeof article === 'string') return `Saved article ${index + 1} ${article}.`
    savedArticles.push(article)
  }

  return { version, exportedAt, timelines, patients, procedureSets, savedArticles }
}

export function importRows(backup: BackupFile, newId: () => string): ImportRows {
  const newIds = new Map<string, string>()
  const timelines = backup.timelines.map((timeline) => {
    const id = newId()
    newIds.set(timeline.id, id)
    return { ...timeline, id }
  })
  const patients = backup.patients.map((patient) => {
    const oldId = patient.source_timeline_id
    const timelineId = oldId === null ? null : (newIds.get(oldId) ?? null)
    return { ...patient, source_timeline_id: timelineId }
  })
  return { timelines, patients, procedureSets: backup.procedureSets, savedArticles: backup.savedArticles }
}
