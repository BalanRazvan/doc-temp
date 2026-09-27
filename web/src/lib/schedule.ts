import type { Patient, Procedure, Timeline, TimelineVisit, Visit } from './types.ts'

export type VisitStatus = 'scheduled' | 'in-window' | 'deviation'

export type DayVisit = { patient: Patient; visit: Visit }

export type TicksByVisit = { [visitNumber: number]: string[] }

export function parseISO(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function toISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function longDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function shortDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function addDays(date: Date, days: number): Date {
  const out = new Date(date)
  out.setDate(out.getDate() + days)
  return out
}

export function computeVisitDates(patientVisits: TimelineVisit[], anchorISO: string): Visit[] {
  if (patientVisits.length === 0) return []
  const anchorWeek = patientVisits[0].week
  const anchor = parseISO(anchorISO)
  return patientVisits.map((visit) => ({
    ...visit,
    procedures: [...visit.procedures],
    targetDate: toISO(addDays(anchor, (visit.week - anchorWeek) * 7)),
  }))
}

export function orderVisits(visits: TimelineVisit[]): TimelineVisit[] {
  return visits
    .toSorted((a, b) => a.week - b.week)
    .map((visit, index) => ({ ...visit, visitNumber: index + 1 }))
}

export function fixedStepVisits(
  count: number,
  everyWeeks: number,
  window: number,
  ticks: TicksByVisit,
): TimelineVisit[] {
  const visits: TimelineVisit[] = []
  for (let index = 0; index < count; index++) {
    const visitNumber = index + 1
    visits.push({ visitNumber, week: index * everyWeeks, window, procedures: ticks[visitNumber] ?? [] })
  }
  return visits
}

export function addProcedure(procedures: Procedure[], id: string): Procedure[] {
  return [...procedures, { id, name: '' }]
}

export function renameProcedure(procedures: Procedure[], id: string, name: string): Procedure[] {
  return procedures.map((procedure) => (procedure.id === id ? { ...procedure, name } : procedure))
}

export function removeProcedure(procedures: Procedure[], id: string): Procedure[] {
  return procedures.filter((procedure) => procedure.id !== id)
}

export function toggleTick(procedureIds: string[], procedureId: string): string[] {
  if (procedureIds.includes(procedureId)) return procedureIds.filter((id) => id !== procedureId)
  return [...procedureIds, procedureId]
}

export function dropRemovedTicks(visits: TimelineVisit[], procedures: Procedure[]): TimelineVisit[] {
  const listed = new Set(procedures.map((procedure) => procedure.id))
  return visits.map((visit) => ({ ...visit, procedures: visit.procedures.filter((id) => listed.has(id)) }))
}

export function snapshotVisits(timeline: Timeline, anchorISO: string): Visit[] {
  return computeVisitDates(timeline.visits, anchorISO)
}

export function resnapshot(
  patientVisits: Visit[],
  timeline: Timeline,
  anchorISO: string,
): Visit[] {
  const previous = new Map(patientVisits.map((visit) => [visit.visitNumber, visit]))
  return snapshotVisits(timeline, anchorISO).map((visit) => {
    const recorded = previous.get(visit.visitNumber)
    if (!recorded) return visit
    const carried = { ...visit }
    if (recorded.actualDate) carried.actualDate = recorded.actualDate
    if (recorded.note) carried.note = recorded.note
    return carried
  })
}

export function droppedRecords(patientVisits: Visit[], timeline: Timeline): Visit[] {
  const kept = new Set(timeline.visits.map((visit) => visit.visitNumber))
  return patientVisits.filter((visit) => {
    if (kept.has(visit.visitNumber)) return false
    return Boolean(visit.actualDate || visit.note)
  })
}

export function windowDates(visit: Visit): { from: string; to: string } {
  const target = parseISO(visit.targetDate)
  return {
    from: toISO(addDays(target, -visit.window)),
    to: toISO(addDays(target, visit.window)),
  }
}

export function visitStatus(visit: Visit): VisitStatus {
  if (!visit.actualDate) return 'scheduled'
  const { from, to } = windowDates(visit)
  return visit.actualDate >= from && visit.actualDate <= to ? 'in-window' : 'deviation'
}

export function recordActual(visit: Visit, dateISO: string | null): Visit {
  const updated = { ...visit }
  if (dateISO) updated.actualDate = dateISO
  else delete updated.actualDate
  return updated
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function addMonths(monthISO: string, months: number): string {
  const date = parseISO(monthISO)
  return toISO(new Date(date.getFullYear(), date.getMonth() + months, 1, 12))
}

export function monthGrid(monthISO: string): string[] {
  const first = parseISO(monthISO)
  const daysBefore = first.getDay() === 0 ? 6 : first.getDay() - 1
  const start = addDays(first, -daysBefore)
  const days: string[] = []
  for (let index = 0; index < 42; index++) {
    days.push(toISO(addDays(start, index)))
  }
  return days
}

export function visitsOn(patients: Patient[], dayISO: string): DayVisit[] {
  const found: DayVisit[] = []
  for (const patient of patients) {
    for (const visit of patient.visits) {
      if (visit.targetDate === dayISO) found.push({ patient, visit })
    }
  }
  return found
}

export function windowsOn(patients: Patient[], dayISO: string): DayVisit[] {
  const found: DayVisit[] = []
  for (const patient of patients) {
    if (patient.visits.some((visit) => visit.targetDate === dayISO)) continue
    for (const visit of patient.visits) {
      if (visit.actualDate) continue
      const { from, to } = windowDates(visit)
      if (from <= dayISO && dayISO <= to) found.push({ patient, visit })
    }
  }
  return found
}

export function attendedOn(patients: Patient[], dayISO: string): DayVisit[] {
  const found: DayVisit[] = []
  for (const patient of patients) {
    for (const visit of patient.visits) {
      if (visit.actualDate === dayISO && visit.actualDate !== visit.targetDate) found.push({ patient, visit })
    }
  }
  return found
}

export function plannedProcedures(patient: Patient, visit: Visit): Procedure[] {
  return patient.procedures.filter((procedure) => visit.procedures.includes(procedure.id))
}

function goldenAngleColor(n: number): string {
  return `hsl(${(n * 137.5) % 360} 70% 50%)`
}

export function nextColor(usedColors: (string | null)[]): string {
  let n = 0
  while (n < usedColors.length && usedColors.includes(goldenAngleColor(n))) n++
  return goldenAngleColor(n)
}
