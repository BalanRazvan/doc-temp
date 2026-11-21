import { addDays, addMonths, parseISO, startOfMonth, toISO, visitStatus, windowDates } from './schedule.ts'
import type { DayVisit } from './schedule.ts'
import type { Patient, Timeline, Visit } from './types.ts'

export type Summary = {
  openToday: DayVisit[]
  dueThisWeek: DayVisit[]
  closingSoon: DayVisit[]
  overdue: DayVisit[]
  deviations: DayVisit[]
  counts: {
    patients: number
    activePatients: number
    timelines: number
    activeTimelines: number
    visitsThisMonth: number
    visitsLastMonth: number
    recorded: number
  }
}

export type PatientProgress = {
  next: Visit | null
  recorded: number
  deviations: number
  overdue: number
}

function byDate(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function buildSummary(patients: Patient[], timelines: Timeline[], today: string): Summary {
  const weekEnd = toISO(addDays(parseISO(today), 6))
  const closingEnd = toISO(addDays(parseISO(today), 3))
  const thisMonth = today.slice(0, 7)
  const lastMonth = addMonths(startOfMonth(today), -1).slice(0, 7)

  const all: DayVisit[] = []
  for (const patient of patients) {
    for (const visit of patient.visits) all.push({ patient, visit })
  }
  const open = all.filter(({ visit }) => !visit.actualDate)

  const openToday = open.filter(({ visit }) => {
    const { from, to } = windowDates(visit)
    return from <= today && today <= to
  })
  const dueThisWeek = open.filter(({ visit }) => today <= visit.targetDate && visit.targetDate <= weekEnd)
  const closingSoon = open.filter(({ visit }) => {
    const lastDay = windowDates(visit).to
    return today <= lastDay && lastDay <= closingEnd
  })
  const overdue = open.filter(({ visit }) => windowDates(visit).to < today)
  const deviations = all.filter(({ visit }) => visitStatus(visit) === 'deviation')

  const activePatients = patients.filter((patient) =>
    patient.visits.some((visit) => !visit.actualDate && windowDates(visit).to >= today),
  )
  const activeTimelines = timelines.filter((timeline) =>
    activePatients.some((patient) => patient.source_timeline_id === timeline.id),
  )

  return {
    openToday: openToday.toSorted((a, b) => byDate(windowDates(a.visit).to, windowDates(b.visit).to)),
    dueThisWeek: dueThisWeek.toSorted((a, b) => byDate(a.visit.targetDate, b.visit.targetDate)),
    closingSoon: closingSoon.toSorted((a, b) => byDate(windowDates(a.visit).to, windowDates(b.visit).to)),
    overdue: overdue.toSorted((a, b) => byDate(windowDates(b.visit).to, windowDates(a.visit).to)),
    deviations: deviations.toSorted((a, b) => byDate(b.visit.actualDate ?? '', a.visit.actualDate ?? '')),
    counts: {
      patients: patients.length,
      activePatients: activePatients.length,
      timelines: timelines.length,
      activeTimelines: activeTimelines.length,
      visitsThisMonth: all.filter(({ visit }) => visit.targetDate.slice(0, 7) === thisMonth).length,
      visitsLastMonth: all.filter(({ visit }) => visit.targetDate.slice(0, 7) === lastMonth).length,
      recorded: all.filter(({ visit }) => visit.actualDate).length,
    },
  }
}

export function patientProgress(patient: Patient, today: string): PatientProgress {
  let next: Visit | null = null
  let recorded = 0
  let deviations = 0
  let overdue = 0
  for (const visit of patient.visits) {
    if (visit.actualDate) {
      recorded++
      if (visitStatus(visit) === 'deviation') deviations++
    } else if (windowDates(visit).to < today) {
      overdue++
    } else if (next === null || visit.targetDate < next.targetDate) {
      next = visit
    }
  }
  return { next, recorded, deviations, overdue }
}
