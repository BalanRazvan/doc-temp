import type { Timeline, TimelineVisit, Visit } from './types.ts'

export type VisitStatus = 'scheduled' | 'in-window' | 'deviation'

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
