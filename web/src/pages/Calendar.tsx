import { useState } from 'react'
import { Link } from 'react-router'
import { addMonths, longDate, monthGrid, parseISO, startOfMonth, toISO, visitsOn, windowsOn } from '../lib/schedule.ts'
import { useStore } from '../lib/store.ts'
import type { Patient } from '../lib/types.ts'
import { secondaryButtonClass } from '../lib/ui.ts'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Calendar() {
  const timelines = useStore((state) => state.timelines)
  const timelinesStatus = useStore((state) => state.timelinesStatus)
  const loadTimelines = useStore((state) => state.loadTimelines)
  const patients = useStore((state) => state.patients)
  const patientsStatus = useStore((state) => state.patientsStatus)
  const loadPatients = useStore((state) => state.loadPatients)

  const today = toISO(new Date())
  const [month, setMonth] = useState(startOfMonth(today))

  function colorOf(patient: Patient) {
    const timeline = timelines.find((candidate) => candidate.id === patient.source_timeline_id)
    return timeline?.color ?? undefined
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
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        {weekdays.map((weekday) => (
          <div key={weekday} className="bg-white py-1.5 text-center text-xs font-medium text-slate-500">
            {weekday}
          </div>
        ))}
        {monthGrid(month).map((day, index) => {
          const targets = visitsOn(patients, day)
          const windows = windowsOn(patients, day)
          const total = targets.length + windows.length
          const room = total > 3 ? 2 : 3
          const shownTargets = targets.slice(0, room)
          const shownWindows = windows.slice(0, room - shownTargets.length)
          const hidden = total - shownTargets.length - shownWindows.length
          const inMonth = day.slice(0, 7) === month.slice(0, 7)
          return (
            <div
              key={day}
              className={`group relative flex flex-col gap-0.5 overflow-hidden p-1 ${inMonth ? 'bg-white' : 'bg-slate-50'} ${
                total > 0 ? 'hover:z-10 hover:shadow-lg hover:ring-2 hover:ring-slate-300' : ''
              }`}
            >
              <span
                className={`flex h-6 min-w-6 items-center justify-center self-center rounded-full px-1.5 text-sm ${
                  day === today ? 'bg-slate-900 font-semibold text-white' : inMonth ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {parseISO(day).getDate()}
              </span>
              {shownTargets.map(({ patient, visit }) => {
                const color = colorOf(patient)
                return (
                  <div
                    key={`${patient.id}-${visit.visitNumber}`}
                    className="flex rounded border border-slate-300 bg-slate-300 px-1.5 text-xs leading-5 font-medium text-slate-900"
                    style={{
                      backgroundColor: color,
                      borderColor: color,
                      color: color ? `contrast-color(${color})` : undefined,
                    }}
                  >
                    <span className="truncate">{patient.name}</span>
                    <span className="shrink-0 pl-1">· #{visit.visitNumber}</span>
                  </div>
                )
              })}
              {shownWindows.map(({ patient, visit }) => {
                const color = colorOf(patient)
                return (
                  <div
                    key={`${patient.id}-${visit.visitNumber}`}
                    className="flex rounded border border-slate-300 bg-slate-100 px-1.5 text-xs leading-5 text-slate-700"
                    style={{
                      backgroundColor: color ? `color-mix(in srgb, ${color} 20%, white)` : undefined,
                      borderColor: color,
                    }}
                  >
                    <span className="truncate">{patient.name}</span>
                    <span className="shrink-0 pl-1">· #{visit.visitNumber}</span>
                  </div>
                )
              })}
              {hidden > 0 && <p className="px-1 text-xs leading-5 text-slate-500">+{hidden} more</p>}

              {total > 0 && (
                <div
                  className={`pointer-events-none fixed top-1/2 z-20 hidden w-80 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl group-hover:block ${
                    index % 7 < 4 ? 'right-6' : 'left-6'
                  }`}
                >
                  <h2 className="mb-3 font-semibold text-slate-900">{longDate(day)}</h2>
                  <ul className="max-h-[70vh] space-y-2 overflow-hidden text-sm">
                    {targets.map(({ patient, visit }) => (
                      <li key={`${patient.id}-${visit.visitNumber}`} className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full bg-slate-300"
                          style={{ backgroundColor: colorOf(patient) }}
                        />
                        <span className="truncate font-medium text-slate-900">{patient.name}</span>
                        <span className="shrink-0 text-slate-500">#{visit.visitNumber}</span>
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
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
