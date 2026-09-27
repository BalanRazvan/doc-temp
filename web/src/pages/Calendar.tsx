import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import Legend from '../components/Legend.tsx'
import {
  addMonths,
  attendedOn,
  longDate,
  monthGrid,
  parseISO,
  plannedProcedures,
  shortDate,
  startOfMonth,
  toISO,
  visitsOn,
  visitStatus,
  windowDates,
  windowsOn,
} from '../lib/schedule.ts'
import type { DayVisit } from '../lib/schedule.ts'
import { useStore } from '../lib/store.ts'
import type { Patient, Visit } from '../lib/types.ts'
import { attendedPillClass, secondaryButtonClass, targetPillClass, windowPillClass } from '../lib/ui.ts'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function statusGlyph(visit: Visit) {
  const status = visitStatus(visit)
  if (status === 'in-window') {
    return (
      <span title="In window" className="shrink-0">
        ✓
      </span>
    )
  }
  if (status === 'deviation') {
    return (
      <span title="Deviation: outside the window" className="shrink-0">
        ⚠
      </span>
    )
  }
  return null
}

export default function Calendar() {
  const timelines = useStore((state) => state.timelines)
  const timelinesStatus = useStore((state) => state.timelinesStatus)
  const loadTimelines = useStore((state) => state.loadTimelines)
  const patients = useStore((state) => state.patients)
  const patientsStatus = useStore((state) => state.patientsStatus)
  const loadPatients = useStore((state) => state.loadPatients)

  const today = toISO(new Date())
  const [month, setMonth] = useState(startOfMonth(today))
  const [openDay, setOpenDay] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (openDay) dialogRef.current?.showModal()
  }, [openDay])

  function timelineOf(patient: Patient) {
    return timelines.find((candidate) => candidate.id === patient.source_timeline_id)
  }

  function colorOf(patient: Patient) {
    return timelineOf(patient)?.color ?? undefined
  }

  function dayCard(kind: 'target' | 'attended' | 'window', { patient, visit }: DayVisit) {
    const color = colorOf(patient)
    let pillClass = targetPillClass
    let pillStyle: CSSProperties = {
      backgroundColor: color,
      borderColor: color,
      color: color ? `contrast-color(${color})` : undefined,
    }
    let label = 'Target day'
    if (kind === 'attended') {
      pillClass = attendedPillClass
      pillStyle = { borderColor: color }
      label = 'Attended on this day'
    }
    if (kind === 'window') {
      pillClass = windowPillClass
      pillStyle = { backgroundColor: color ? `color-mix(in srgb, ${color} 20%, white)` : undefined, borderColor: color }
      label = 'Window day'
    }
    const { from, to } = windowDates(visit)
    const procedures = plannedProcedures(patient, visit)
    return (
      <article
        key={`${patient.id}-${visit.visitNumber}`}
        className="flex w-56 flex-col gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-900"
      >
        <div className="space-y-1">
          <span className={pillClass} style={pillStyle}>
            <span className="min-w-0 break-words">
              {statusGlyph(visit)} {patient.name} <span className="whitespace-nowrap">· #{visit.visitNumber}</span>
            </span>
          </span>
          <p className="text-slate-500">{label}</p>
          <p className="text-slate-700">{timelineOf(patient)?.name ?? 'No timeline'}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
          <dt className="text-slate-500">Target</dt>
          <dd>{longDate(visit.targetDate)}</dd>
          <dt className="text-slate-500">Window</dt>
          <dd>
            {shortDate(from)} – {shortDate(to)}
          </dd>
          {visit.actualDate && (
            <>
              <dt className="text-slate-500">Attended</dt>
              <dd>{longDate(visit.actualDate)}</dd>
            </>
          )}
        </dl>
        <div>
          <h3 className="mb-1 text-xs font-medium tracking-wide text-slate-500 uppercase">Procedures</h3>
          {procedures.length === 0 ? (
            <p className="text-slate-500">None planned</p>
          ) : (
            <ul className="space-y-0.5">
              {procedures.map((procedure) => (
                <li key={procedure.id} className="break-words">
                  {procedure.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        {visit.note && (
          <p className="break-words text-slate-700">
            <span className="text-slate-500">Note: </span>
            {visit.note}
          </p>
        )}
      </article>
    )
  }

  function retry() {
    if (timelinesStatus === 'error') loadTimelines()
    if (patientsStatus === 'error') loadPatients()
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
    return <p className="p-6 text-sm text-slate-500">Loading calendar…</p>
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <button
            onClick={() => setMonth(addMonths(month, -1))}
            aria-label="Previous month"
            className={secondaryButtonClass}
          >
            ‹
          </button>
          <button onClick={() => setMonth(startOfMonth(today))} className={secondaryButtonClass}>
            Today
          </button>
          <button onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month" className={secondaryButtonClass}>
            ›
          </button>
        </div>
        <h1 className="text-2xl font-semibold">
          {parseISO(month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </h1>
        {patients.length === 0 && (
          <p className="text-sm text-slate-600">
            No patients yet.{' '}
            <Link to="/patients" className="font-medium text-slate-900 underline">
              Add one on the Patients page.
            </Link>
          </p>
        )}
        <button popoverTarget="legend" className={`ml-auto ${secondaryButtonClass}`}>
          Legend
        </button>
        <div
          id="legend"
          popover="auto"
          className="m-auto max-h-[85vh] w-80 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
        >
          <Legend timelines={timelines} />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        {weekdays.map((weekday) => (
          <div key={weekday} className="bg-white py-1.5 text-center text-xs font-medium text-slate-500">
            {weekday}
          </div>
        ))}
        {monthGrid(month).map((day, index) => {
          const targets = visitsOn(patients, day)
          const attended = attendedOn(patients, day)
          const windows = windowsOn(patients, day)
          const total = targets.length + attended.length + windows.length
          const room = total > 3 ? 2 : 3
          const shownTargets = targets.slice(0, room)
          const shownAttended = attended.slice(0, room - shownTargets.length)
          const shownWindows = windows.slice(0, room - shownTargets.length - shownAttended.length)
          const hidden = total - shownTargets.length - shownAttended.length - shownWindows.length
          const inMonth = day.slice(0, 7) === month.slice(0, 7)
          const dayNumber = (
            <span
              className={`flex h-6 min-w-6 items-center justify-center self-center rounded-full px-1.5 text-sm ${
                day === today ? 'bg-slate-900 font-semibold text-white' : inMonth ? 'text-slate-700' : 'text-slate-400'
              }`}
            >
              {parseISO(day).getDate()}
            </span>
          )
          if (total === 0) {
            return (
              <div key={day} className={`flex flex-col p-1 ${inMonth ? 'bg-white' : 'bg-slate-50'}`}>
                {dayNumber}
              </div>
            )
          }
          return (
            <div
              key={day}
              className={`group relative flex flex-col overflow-hidden hover:z-10 hover:shadow-lg hover:ring-2 hover:ring-slate-300 ${
                inMonth ? 'bg-white' : 'bg-slate-50'
              }`}
            >
              <button
                onClick={() => setOpenDay(day)}
                aria-label={`${longDate(day)}, ${total} ${total === 1 ? 'visit' : 'visits'}`}
                className="flex min-h-0 flex-1 flex-col gap-0.5 p-1 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900"
              >
                {dayNumber}
                {shownTargets.map(({ patient, visit }) => {
                  const color = colorOf(patient)
                  return (
                    <span
                      key={`${patient.id}-${visit.visitNumber}`}
                      className={targetPillClass}
                      style={{
                        backgroundColor: color,
                        borderColor: color,
                        color: color ? `contrast-color(${color})` : undefined,
                      }}
                    >
                      {statusGlyph(visit)}
                      <span className="truncate">{patient.name}</span>
                      <span className="shrink-0">· #{visit.visitNumber}</span>
                    </span>
                  )
                })}
                {shownAttended.map(({ patient, visit }) => (
                  <span
                    key={`${patient.id}-${visit.visitNumber}`}
                    className={attendedPillClass}
                    style={{ borderColor: colorOf(patient) }}
                  >
                    {statusGlyph(visit)}
                    <span className="truncate">{patient.name}</span>
                    <span className="shrink-0">· #{visit.visitNumber}</span>
                  </span>
                ))}
                {shownWindows.map(({ patient, visit }) => {
                  const color = colorOf(patient)
                  return (
                    <span
                      key={`${patient.id}-${visit.visitNumber}`}
                      className={windowPillClass}
                      style={{
                        backgroundColor: color ? `color-mix(in srgb, ${color} 20%, white)` : undefined,
                        borderColor: color,
                      }}
                    >
                      <span className="truncate">{patient.name}</span>
                      <span className="shrink-0">· #{visit.visitNumber}</span>
                    </span>
                  )
                })}
                {hidden > 0 && <span className="px-1 text-xs leading-5 text-slate-500">+{hidden} more</span>}
              </button>

              <div
                className={`pointer-events-none fixed top-1/2 z-20 hidden w-80 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl group-hover:block ${
                  index % 7 < 4 ? 'right-6' : 'left-6'
                }`}
              >
                <h2 className="mb-3 font-semibold text-slate-900">{longDate(day)}</h2>
                <ul className="max-h-[70vh] space-y-2 overflow-hidden text-sm text-slate-900">
                  {targets.map(({ patient, visit }) => (
                    <li key={`${patient.id}-${visit.visitNumber}`} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full bg-slate-300"
                        style={{ backgroundColor: colorOf(patient) }}
                      />
                      <span className="truncate font-medium text-slate-900">{patient.name}</span>
                      <span className="shrink-0 text-slate-500">#{visit.visitNumber}</span>
                      {statusGlyph(visit)}
                    </li>
                  ))}
                  {attended.map(({ patient, visit }) => (
                    <li key={`${patient.id}-${visit.visitNumber}`} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border-2 border-slate-300 bg-white"
                        style={{ borderColor: colorOf(patient) }}
                      />
                      <span className="truncate font-medium text-slate-900">{patient.name}</span>
                      <span className="shrink-0 text-slate-500">#{visit.visitNumber} · attended</span>
                      {statusGlyph(visit)}
                    </li>
                  ))}
                  {windows.map(({ patient, visit }) => {
                    const color = colorOf(patient)
                    return (
                      <li key={`${patient.id}-${visit.visitNumber}`} className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-slate-300 bg-slate-100"
                          style={{
                            backgroundColor: color ? `color-mix(in srgb, ${color} 20%, white)` : undefined,
                            borderColor: color,
                          }}
                        />
                        <span className="truncate text-slate-700">{patient.name}</span>
                        <span className="shrink-0 text-slate-500">#{visit.visitNumber} · window</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="day-heading"
        onClose={() => setOpenDay(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close()
        }}
        className="m-auto max-h-[85vh] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl backdrop:bg-slate-900/20"
      >
        {openDay && (
          <>
            <div className="sticky top-0 flex items-center gap-4 border-b border-slate-200 bg-white px-5 py-3">
              <h2 id="day-heading" className="font-semibold text-slate-900">
                {longDate(openDay)}
              </h2>
              <button onClick={() => dialogRef.current?.close()} className={`ml-auto ${secondaryButtonClass}`}>
                Close
              </button>
            </div>
            <div className="flex max-w-[75.5rem] flex-wrap gap-3 p-5">
              {visitsOn(patients, openDay).map((found) => dayCard('target', found))}
              {attendedOn(patients, openDay).map((found) => dayCard('attended', found))}
              {windowsOn(patients, openDay).map((found) => dayCard('window', found))}
            </div>
          </>
        )}
      </dialog>
    </div>
  )
}
