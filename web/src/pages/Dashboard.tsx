import { useState } from 'react'
import { Link } from 'react-router'
import { addDays, addMonths, longDate, parseISO, shortDate, startOfMonth, toISO, visitStatus, windowDates } from '../lib/schedule.ts'
import type { DayVisit } from '../lib/schedule.ts'
import { useStore } from '../lib/store.ts'
import { buildSummary } from '../lib/summary.ts'
import { dotClass, secondaryButtonClass } from '../lib/ui.ts'

const shownAtFirst = 5

const cardClass = 'space-y-3 rounded-xl border border-slate-200 p-5 shadow-sm'

const linkClass = 'inline-block text-sm font-medium text-slate-900 underline'

const moreClass = 'text-sm font-medium text-slate-600 hover:text-slate-900'

function monthName(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-GB', { month: 'long' })
}

export default function Dashboard() {
  const timelines = useStore((state) => state.timelines)
  const timelinesStatus = useStore((state) => state.timelinesStatus)
  const loadTimelines = useStore((state) => state.loadTimelines)
  const patients = useStore((state) => state.patients)
  const patientsStatus = useStore((state) => state.patientsStatus)
  const loadPatients = useStore((state) => state.loadPatients)

  const [allOverdue, setAllOverdue] = useState(false)
  const [allDeviations, setAllDeviations] = useState(false)

  const today = toISO(new Date())

  function retry() {
    if (timelinesStatus === 'error') loadTimelines()
    if (patientsStatus === 'error') loadPatients()
  }

  function visitRow({ patient, visit }: DayVisit) {
    const timeline = timelines.find((candidate) => candidate.id === patient.source_timeline_id)
    const { from, to } = windowDates(visit)
    return (
      <li key={`${patient.id}-${visit.visitNumber}`} className="flex items-baseline gap-2 py-1.5 text-sm">
        {visitStatus(visit) === 'deviation' && (
          <span title="Deviation: outside the window" className="shrink-0">
            ⚠
          </span>
        )}
        <span className={dotClass} style={{ backgroundColor: timeline?.color ?? undefined }} />
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <span className="font-medium break-words">{patient.name}</span>
          <span className="text-slate-500">#{visit.visitNumber}</span>
          <span className="text-slate-500">{timeline?.name ?? 'No timeline'}</span>
          <span className="ml-auto text-slate-700">
            {visit.actualDate && `attended ${shortDate(visit.actualDate)} · window `}
            {shortDate(from)} – {shortDate(to)}
          </span>
        </div>
      </li>
    )
  }

  if (timelinesStatus === 'error' || patientsStatus === 'error') {
    return (
      <div className="p-6">
        <div className="max-w-md space-y-3 rounded-xl border border-slate-200 p-5">
          {timelinesStatus === 'error' && <p className="text-sm text-red-600">Couldn't load your timelines.</p>}
          {patientsStatus === 'error' && <p className="text-sm text-red-600">Couldn't load your patients.</p>}
          <button onClick={retry} className={secondaryButtonClass}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (timelinesStatus !== 'ready' || patientsStatus !== 'ready') {
    return <p className="p-6 text-sm text-slate-500">Loading dashboard…</p>
  }

  const summary = buildSummary(patients, timelines, today)
  const counts = summary.counts
  const overdue = allOverdue ? summary.overdue : summary.overdue.slice(0, shownAtFirst)
  const deviations = allDeviations ? summary.deviations : summary.deviations.slice(0, shownAtFirst)

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-600">{longDate(today)}</p>
        {patients.length === 0 && (
          <p className="text-sm text-slate-600">
            No patients yet.{' '}
            <Link to="/patients" className="font-medium text-slate-900 underline">
              Add one on the Patients page.
            </Link>
          </p>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className={cardClass}>
            <h2 className="text-lg font-semibold">Needs attention</h2>
            <h3 className="text-sm font-medium text-slate-600">Closing soon · {summary.closingSoon.length}</h3>
            {summary.closingSoon.length === 0 ? (
              <p className="text-sm text-slate-500">No window closes in the next three days.</p>
            ) : (
              <ul className="divide-y divide-slate-100">{summary.closingSoon.map(visitRow)}</ul>
            )}
            <h3 className="text-sm font-medium text-slate-600">Overdue · {summary.overdue.length}</h3>
            {summary.overdue.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing overdue.</p>
            ) : (
              <ul className="divide-y divide-slate-100">{overdue.map(visitRow)}</ul>
            )}
            {summary.overdue.length > shownAtFirst && (
              <button onClick={() => setAllOverdue(!allOverdue)} className={`block ${moreClass}`}>
                {allOverdue ? 'Show fewer' : `+${summary.overdue.length - shownAtFirst} more`}
              </button>
            )}
            <Link to="/calendar" className={linkClass}>
              Open the calendar
            </Link>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-semibold">At a glance</h2>
            <ul className="grid grid-cols-2 gap-4">
              <li>
                <p className="text-sm text-slate-600">Active patients</p>
                <p className="text-2xl font-semibold">{counts.activePatients}</p>
                <p className="text-sm text-slate-500">of {counts.patients}</p>
              </li>
              <li>
                <p className="text-sm text-slate-600">Timelines in use</p>
                <p className="text-2xl font-semibold">{counts.activeTimelines}</p>
                <p className="text-sm text-slate-500">of {counts.timelines}</p>
              </li>
              <li>
                <p className="text-sm text-slate-600">Visits in {monthName(today)}</p>
                <p className="text-2xl font-semibold">{counts.visitsThisMonth}</p>
                <p className="text-sm text-slate-500">
                  {counts.visitsLastMonth} in {monthName(addMonths(startOfMonth(today), -1))}
                </p>
              </li>
              <li>
                <p className="text-sm text-slate-600">Deviations</p>
                {counts.recorded === 0 ? (
                  <>
                    <p className="text-2xl font-semibold">—</p>
                    <p className="text-sm text-slate-500">No visits recorded yet</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-semibold">
                      {Math.round((summary.deviations.length / counts.recorded) * 100)}%
                    </p>
                    <p className="text-sm text-slate-500">
                      {summary.deviations.length} of {counts.recorded} recorded
                    </p>
                  </>
                )}
              </li>
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className={cardClass}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 className="text-lg font-semibold">This week</h2>
              <p className="text-sm text-slate-500">
                {shortDate(today)} – {shortDate(toISO(addDays(parseISO(today), 6)))}
              </p>
            </div>
            {summary.dueThisWeek.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing due this week.</p>
            ) : (
              <ul className="divide-y divide-slate-100">{summary.dueThisWeek.map(visitRow)}</ul>
            )}
            <Link to="/patients" className={linkClass}>
              Open the Patients page
            </Link>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-semibold">Recent deviations</h2>
            {summary.deviations.length === 0 ? (
              <p className="text-sm text-slate-500">No deviations recorded.</p>
            ) : (
              <ul className="divide-y divide-slate-100">{deviations.map(visitRow)}</ul>
            )}
            {summary.deviations.length > shownAtFirst && (
              <button onClick={() => setAllDeviations(!allDeviations)} className={`block ${moreClass}`}>
                {allDeviations ? 'Show fewer' : `+${summary.deviations.length - shownAtFirst} more`}
              </button>
            )}
            <Link to="/patients" className={linkClass}>
              Open the Patients page
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
