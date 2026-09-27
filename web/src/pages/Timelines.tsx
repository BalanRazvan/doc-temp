import { useState } from 'react'
import type { SubmitEvent } from 'react'
import {
  addProcedure,
  appendNames,
  computeVisitDates,
  dropRemovedTicks,
  fixedStepVisits,
  longDate,
  nextColor,
  orderVisits,
  removeProcedure,
  renameProcedure,
  repeatedName,
  shortDate,
  toggleTick,
  toISO,
  windowDates,
} from '../lib/schedule.ts'
import type { TicksByVisit } from '../lib/schedule.ts'
import { useStore } from '../lib/store.ts'
import type { Procedure, Timeline, TimelineVisit } from '../lib/types.ts'
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from '../lib/ui.ts'

type Mode = 'fixed' | 'per-visit'

type Row = { week: string; window: string; procedures: string[] }

function isWholeNumber(text: string): boolean {
  return text.trim() !== '' && Number.isInteger(Number(text))
}

function fixedProblem(count: string, every: string, windowDays: string): string {
  if (!isWholeNumber(count) || Number(count) < 1 || Number(count) > 200) {
    return 'The number of visits must be a whole number from 1 to 200.'
  }
  if (!isWholeNumber(every) || Number(every) < 1) {
    return 'Weeks between visits must be a whole number, 1 or more.'
  }
  if (!isWholeNumber(windowDays) || Number(windowDays) < 0) {
    return 'The window must be a whole number of days, 0 or more.'
  }
  return ''
}

function rowsProblem(rows: Row[]): string {
  if (rows.length === 0) return 'Add at least one visit.'
  if (!rows.every((row) => isWholeNumber(row.week))) {
    return 'Every week must be a whole number. Negative weeks are fine.'
  }
  if (!rows.every((row) => isWholeNumber(row.window) && Number(row.window) >= 0)) {
    return 'Every window must be a whole number of days, 0 or more.'
  }
  const weeks = rows.map((row) => Number(row.week))
  if (new Set(weeks).size < weeks.length) return 'Two visits cannot share the same week.'
  return ''
}

function proceduresProblem(procedures: Procedure[]): string {
  const names = procedures.map((procedure) => procedure.name.trim())
  if (names.includes('')) return 'Every procedure needs a name, or remove its row.'
  const repeat = repeatedName(names)
  if (repeat) return `Two procedures are both called "${repeat}".`
  return ''
}

function toRow(visit: TimelineVisit): Row {
  return { week: String(visit.week), window: String(visit.window), procedures: visit.procedures }
}

function toVisit(row: Row, index: number): TimelineVisit {
  return {
    visitNumber: index + 1,
    week: Number(row.week),
    window: Number(row.window),
    procedures: row.procedures,
  }
}

function modeClass(active: boolean): string {
  return active
    ? 'flex-1 rounded-md bg-white px-3 py-1.5 text-slate-900 shadow-sm'
    : 'flex-1 rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-900'
}

export default function Timelines() {
  const timelines = useStore((state) => state.timelines)
  const timelinesStatus = useStore((state) => state.timelinesStatus)
  const loadTimelines = useStore((state) => state.loadTimelines)
  const addTimeline = useStore((state) => state.addTimeline)
  const updateTimeline = useStore((state) => state.updateTimeline)
  const deleteTimeline = useStore((state) => state.deleteTimeline)
  const patients = useStore((state) => state.patients)
  const patientsStatus = useStore((state) => state.patientsStatus)
  const procedureSets = useStore((state) => state.procedureSets)
  const procedureSetsStatus = useStore((state) => state.procedureSetsStatus)
  const loadProcedureSets = useStore((state) => state.loadProcedureSets)
  const addProcedureSet = useStore((state) => state.addProcedureSet)

  const [editing, setEditing] = useState<Timeline | null>(null)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode>('fixed')
  const [count, setCount] = useState('6')
  const [every, setEvery] = useState('4')
  const [windowDays, setWindowDays] = useState('3')
  const [rows, setRows] = useState<Row[]>([])
  const [fixedTicks, setFixedTicks] = useState<TicksByVisit>({})
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [previewFrom, setPreviewFrom] = useState(toISO(new Date()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [chosenSetId, setChosenSetId] = useState('')
  const [savingSet, setSavingSet] = useState(false)
  const [setsNote, setSetsNote] = useState('')
  const [setsError, setSetsError] = useState('')

  const problem = mode === 'fixed' ? fixedProblem(count, every, windowDays) : rowsProblem(rows)
  let visits: TimelineVisit[] = []
  if (!problem) {
    visits =
      mode === 'fixed'
        ? fixedStepVisits(Number(count), Number(every), Number(windowDays), fixedTicks)
        : orderVisits(rows.map(toVisit))
    visits = dropRemovedTicks(visits, procedures)
  }
  const preview = previewFrom ? computeVisitDates(visits, previewFrom) : []

  const newColor = nextColor(timelines.map((timeline) => timeline.color))
  const formColor = editing ? editing.color : newColor

  function startNew() {
    setEditing(null)
    setName('')
    setMode('fixed')
    setFixedTicks({})
    setProcedures([])
    setError('')
    setSetsNote('')
    setSetsError('')
  }

  function startEdit(timeline: Timeline) {
    setEditing(timeline)
    setName(timeline.name)
    setMode('per-visit')
    setRows(timeline.visits.map(toRow))
    setFixedTicks({})
    setProcedures(timeline.procedures)
    setError('')
    setSetsNote('')
    setSetsError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function choosePerVisit() {
    if (mode === 'per-visit') return
    setRows(visits.map(toRow))
    setMode('per-visit')
  }

  function changeRow(index: number, changed: Row) {
    setRows(rows.map((row, i) => (i === index ? changed : row)))
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index))
  }

  function addRow() {
    setRows([...rows, { week: '', window: '', procedures: [] }])
  }

  function toggleCell(visit: TimelineVisit, procedureId: string) {
    const ticked = toggleTick(visit.procedures, procedureId)
    if (mode === 'fixed') {
      setFixedTicks({ ...fixedTicks, [visit.visitNumber]: ticked })
    } else {
      setRows(rows.map((row) => (Number(row.week) === visit.week ? { ...row, procedures: ticked } : row)))
    }
  }

  function applySet() {
    const chosen = procedureSets.find((procedureSet) => procedureSet.id === chosenSetId)
    if (!chosen) return
    const applied = appendNames(procedures, chosen.procedures, () => crypto.randomUUID())
    const added = applied.length - procedures.length
    const skipped = chosen.procedures.length - added
    setProcedures(applied)
    setSetsError('')
    setSetsNote(`Added ${added} from "${chosen.name}"${skipped > 0 ? `; ${skipped} already listed.` : '.'}`)
  }

  async function saveAsSet() {
    setSetsNote('')
    setSetsError('')
    const namesProblem = proceduresProblem(procedures)
    if (namesProblem) {
      setSetsError(namesProblem)
      return
    }
    const answer = window.prompt('Name the new procedure set', name.trim())
    if (answer === null) return
    if (!answer.trim()) {
      setSetsError('The set needs a name.')
      return
    }
    setSavingSet(true)
    const names = procedures.map((procedure) => procedure.name.trim())
    const saveError = await addProcedureSet({ name: answer.trim(), procedures: names })
    setSavingSet(false)
    if (saveError) setSetsError(saveError)
    else setSetsNote(`Saved ${names.length} ${names.length === 1 ? 'name' : 'names'} as the set "${answer.trim()}".`)
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the timeline a name.')
      return
    }
    if (problem) {
      setError(problem)
      return
    }
    const namesProblem = proceduresProblem(procedures)
    if (namesProblem) {
      setError(namesProblem)
      return
    }
    setBusy(true)
    setError('')
    const trimmed = procedures.map((procedure) => ({ ...procedure, name: procedure.name.trim() }))
    const saveError = editing
      ? await updateTimeline(editing.id, { name: name.trim(), visits, procedures: trimmed })
      : await addTimeline({ name: name.trim(), color: newColor, visits, procedures: trimmed })
    setBusy(false)
    if (saveError) setError(saveError)
    else startNew()
  }

  async function handleDelete(timeline: Timeline) {
    let message = `Delete "${timeline.name}"? Patients already on it keep every date and attendance record, but lose this timeline's name and colour.`
    if (patientsStatus === 'ready') {
      const onIt = patients.filter((patient) => patient.source_timeline_id === timeline.id).length
      message =
        onIt === 0
          ? `Delete "${timeline.name}"? No patients are on it.`
          : `Delete "${timeline.name}"? Patients on it: ${onIt}. They keep every date and attendance record, but lose this timeline's name and colour.`
    }
    if (!window.confirm(message)) return
    setListError('')
    const deleteError = await deleteTimeline(timeline.id)
    if (deleteError) setListError(deleteError)
    else if (editing?.id === timeline.id) startNew()
  }

  return (
    <div className="grid items-start gap-6 p-6 lg:grid-cols-5">
      <form
        onSubmit={handleSubmit}
        className={`min-w-0 space-y-5 rounded-xl border border-slate-200 p-6 shadow-sm lg:col-span-3 ${editing ? 'ring-2 ring-slate-400' : ''}`}
      >
        <div className="flex items-center gap-2">
          {(editing || timelinesStatus === 'ready') && (
            <span
              className="h-3 w-3 shrink-0 rounded-full bg-slate-300"
              style={{ backgroundColor: formColor ?? undefined }}
            />
          )}
          <h2 className="text-lg font-semibold">{editing ? 'Edit timeline' : 'New timeline'}</h2>
        </div>

        {editing && (
          <p className="text-sm text-slate-600">
            Patients already on this timeline keep their own copy of its schedule and procedures. These changes
            only reach patients you assign after saving.
          </p>
        )}

        <label className="block space-y-1">
          <span className={labelClass}>Name</span>
          <input
            className={inputClass}
            required
            placeholder="52-week treatment"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
          <button type="button" onClick={() => setMode('fixed')} className={modeClass(mode === 'fixed')}>
            Fixed spacing
          </button>
          <button type="button" onClick={choosePerVisit} className={modeClass(mode === 'per-visit')}>
            Per-visit spacing
          </button>
        </div>

        {mode === 'fixed' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1">
              <span className={labelClass}>Number of visits</span>
              <input
                className={inputClass}
                type="number"
                min="1"
                max="200"
                value={count}
                onChange={(event) => setCount(event.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Weeks between visits</span>
              <input
                className={inputClass}
                type="number"
                min="1"
                value={every}
                onChange={(event) => setEvery(event.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Window (± days)</span>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={windowDays}
                onChange={(event) => setWindowDays(event.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_2rem] gap-2">
              <span className={labelClass}>Week</span>
              <span className={labelClass}>Window (± days)</span>
            </div>
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2">
                <input
                  className={inputClass}
                  type="number"
                  aria-label="Week"
                  value={row.week}
                  onChange={(event) => changeRow(index, { ...row, week: event.target.value })}
                />
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  aria-label="Window in days"
                  value={row.window}
                  onChange={(event) => changeRow(index, { ...row, window: event.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label="Remove visit"
                  className="text-slate-400 hover:text-slate-900"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addRow} className={secondaryButtonClass}>
              + Add visit
            </button>
            <p className="text-xs text-slate-500">
              Rows can be typed in any order. The preview shows the order they are saved in.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block space-y-1 sm:w-60">
            <span className={labelClass}>Preview with the first visit on</span>
            <input
              className={inputClass}
              type="date"
              value={previewFrom}
              onChange={(event) => setPreviewFrom(event.target.value)}
            />
          </label>
          <p className="text-xs text-slate-500">Each patient's anchor date is the date of their first visit.</p>
          {problem && <p className="text-sm text-slate-500">{problem}</p>}
          {!problem && !previewFrom && <p className="text-sm text-slate-500">Pick a date to see the preview.</p>}
          {preview.length > 0 && (
            <table className="w-full text-left text-sm tabular-nums">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 font-medium">Visit</th>
                  <th className="py-1 font-medium">Week</th>
                  <th className="py-1 font-medium">Target</th>
                  <th className="py-1 font-medium">Window</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((visit) => {
                  const { from, to } = windowDates(visit)
                  return (
                    <tr key={visit.visitNumber} className="border-t border-slate-100">
                      <td className="py-1">#{visit.visitNumber}</td>
                      <td className="py-1">{visit.week}</td>
                      <td className="py-1">{longDate(visit.targetDate)}</td>
                      <td className="py-1">
                        {shortDate(from)} – {shortDate(to)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-2">
          <h3 className={labelClass}>Schedule of assessments</h3>
          {problem ? (
            <p className="text-sm text-slate-500">Procedures can be ticked once the visits above are valid.</p>
          ) : (
            <>
              {procedures.length > 0 && (
                <div className="max-w-fit scroll-pl-56 overflow-x-auto rounded-md border border-slate-200">
                  <table className="border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th className="sticky left-0 border-r border-slate-200 bg-white" />
                        {visits.map((visit) => (
                          <th
                            key={visit.visitNumber}
                            scope="col"
                            className="px-1 py-1 text-center text-xs font-medium text-slate-500 tabular-nums"
                          >
                            #{visit.visitNumber}
                            <span className="block font-normal">w{visit.week}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {procedures.map((procedure) => {
                        const label = procedure.name.trim() || 'Unnamed procedure'
                        return (
                          <tr key={procedure.id}>
                            <td className="sticky left-0 border-t border-r border-slate-200 bg-white p-1">
                              <div className="flex items-center gap-1">
                                <input
                                  className="w-44 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                                  aria-label="Procedure name"
                                  placeholder="Procedure"
                                  value={procedure.name}
                                  onChange={(event) =>
                                    setProcedures(renameProcedure(procedures, procedure.id, event.target.value))
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => setProcedures(removeProcedure(procedures, procedure.id))}
                                  aria-label={`Remove ${label}`}
                                  className="w-6 shrink-0 text-slate-400 hover:text-slate-900"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                            {visits.map((visit) => (
                              <td key={visit.visitNumber} className="border-t border-slate-200 p-0">
                                <label className="flex h-9 w-10 items-center justify-center">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-slate-900"
                                    aria-label={`${label} at visit ${visit.visitNumber}`}
                                    checked={visit.procedures.includes(procedure.id)}
                                    onChange={() => toggleCell(visit, procedure.id)}
                                  />
                                </label>
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                type="button"
                onClick={() => setProcedures(addProcedure(procedures, crypto.randomUUID()))}
                className={secondaryButtonClass}
              >
                + Add procedure
              </button>
              {(procedureSetsStatus === 'idle' || procedureSetsStatus === 'loading') && (
                <p className="text-sm text-slate-500">Loading procedure sets…</p>
              )}
              {procedureSetsStatus === 'error' && (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-red-600">Couldn't load your procedure sets.</p>
                  <button type="button" onClick={loadProcedureSets} className={secondaryButtonClass}>
                    Try again
                  </button>
                </div>
              )}
              {procedureSetsStatus === 'ready' && (
                <div className="flex flex-wrap items-center gap-2">
                  {procedureSets.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No procedure sets yet. Make one on the Procedure sets page, or save this list as one.
                    </p>
                  ) : (
                    <>
                      <select
                        className={`${inputClass} sm:w-60`}
                        aria-label="Procedure set"
                        value={chosenSetId}
                        onChange={(event) => setChosenSetId(event.target.value)}
                      >
                        <option value="">Choose a procedure set…</option>
                        {procedureSets.map((procedureSet) => (
                          <option key={procedureSet.id} value={procedureSet.id}>
                            {procedureSet.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={applySet}
                        disabled={!chosenSetId}
                        className={secondaryButtonClass}
                      >
                        Apply
                      </button>
                    </>
                  )}
                  {procedures.length > 0 && (
                    <button
                      type="button"
                      onClick={saveAsSet}
                      disabled={savingSet}
                      className={`ml-auto ${secondaryButtonClass}`}
                    >
                      {savingSet ? 'Saving set…' : 'Save as a set'}
                    </button>
                  )}
                </div>
              )}
              {setsError && <p className="text-sm text-red-600">{setsError}</p>}
              {setsNote && <p className="text-sm text-slate-500">{setsNote}</p>}
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className={buttonClass} disabled={busy || timelinesStatus !== 'ready'}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create timeline'}
          </button>
          {editing && (
            <button type="button" onClick={startNew} className={secondaryButtonClass}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="space-y-4 lg:col-span-2">
        {(timelinesStatus === 'idle' || timelinesStatus === 'loading') && (
          <p className="text-sm text-slate-500">Loading timelines…</p>
        )}
        {timelinesStatus === 'error' && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-red-600">Couldn't load your timelines.</p>
            <button onClick={loadTimelines} className={secondaryButtonClass}>
              Try again
            </button>
          </div>
        )}
        {timelinesStatus === 'ready' && timelines.length === 0 && (
          <p className="text-sm text-slate-500">No timelines yet. The ones you create appear here.</p>
        )}
        {listError && <p className="text-sm text-red-600">{listError}</p>}
        {timelinesStatus === 'ready' &&
          timelines.map((timeline) => (
            <article
              key={timeline.id}
              className={`space-y-2 rounded-xl border border-slate-200 p-5 shadow-sm ${editing?.id === timeline.id ? 'ring-2 ring-slate-400' : ''}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full bg-slate-300"
                  style={{ backgroundColor: timeline.color ?? undefined }}
                />
                <h3 className="min-w-0 truncate font-semibold">{timeline.name}</h3>
                <span className="text-xs text-slate-500">
                  {timeline.visits.length} {timeline.visits.length === 1 ? 'visit' : 'visits'}
                  {timeline.procedures.length > 0 &&
                    ` · ${timeline.procedures.length} ${timeline.procedures.length === 1 ? 'procedure' : 'procedures'}`}
                </span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => startEdit(timeline)} className={secondaryButtonClass}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(timeline)} className={secondaryButtonClass}>
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {timeline.visits.map((visit) => `w${visit.week} ±${visit.window}`).join(' · ')}
              </p>
            </article>
          ))}
      </section>
    </div>
  )
}
