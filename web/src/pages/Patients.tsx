import { Fragment, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router'
import {
  computeVisitDates,
  droppedRecords,
  longDate,
  parseISO,
  recordActual,
  resnapshot,
  snapshotVisits,
  toISO,
  visitStatus,
  windowDates,
} from '../lib/schedule.ts'
import { useStore } from '../lib/store.ts'
import type { PatientChanges } from '../lib/store.ts'
import type { Patient, Visit } from '../lib/types.ts'
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from '../lib/ui.ts'

type OpenVisit = { patientId: string; visitNumber: number }

function shortDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function visitNumbers(visits: Visit[]): string {
  return visits.map((visit) => `#${visit.visitNumber}`).join(', ')
}

export default function Patients() {
  const timelines = useStore((state) => state.timelines)
  const timelinesStatus = useStore((state) => state.timelinesStatus)
  const loadTimelines = useStore((state) => state.loadTimelines)
  const patients = useStore((state) => state.patients)
  const patientsStatus = useStore((state) => state.patientsStatus)
  const loadPatients = useStore((state) => state.loadPatients)
  const addPatient = useStore((state) => state.addPatient)
  const updatePatient = useStore((state) => state.updatePatient)
  const deletePatient = useStore((state) => state.deletePatient)

  const [name, setName] = useState('')
  const [timelineId, setTimelineId] = useState('')
  const [anchor, setAnchor] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [listError, setListError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editAnchor, setEditAnchor] = useState('')
  const [switchId, setSwitchId] = useState('')

  const [openVisit, setOpenVisit] = useState<OpenVisit | null>(null)
  const [visitDate, setVisitDate] = useState('')
  const [visitNote, setVisitNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [cardError, setCardError] = useState('')

  const today = toISO(new Date())
  const editing = patients.find((patient) => patient.id === editingId)
  const switchTo = timelines.find((timeline) => timeline.id === switchId)
  const dropped = editing && switchTo ? droppedRecords(editing.visits, switchTo) : []

  function timelineOf(patient: Patient) {
    return timelines.find((timeline) => timeline.id === patient.source_timeline_id)
  }

  function retry() {
    if (timelinesStatus === 'error') loadTimelines()
    if (patientsStatus === 'error') loadPatients()
  }

  async function handleAdd(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const timeline = timelines.find((candidate) => candidate.id === timelineId)
    if (!name.trim()) {
      setAddError('Give the patient a name or a code.')
      return
    }
    if (!timeline) {
      setAddError('Choose a timeline.')
      return
    }
    if (!anchor) {
      setAddError('Pick the date of the first visit.')
      return
    }
    setAdding(true)
    setAddError('')
    const saveError = await addPatient({
      name: name.trim(),
      anchor_date: anchor,
      source_timeline_id: timeline.id,
      visits: snapshotVisits(timeline, anchor),
      procedures: timeline.procedures,
    })
    setAdding(false)
    if (saveError) {
      setAddError(saveError)
      return
    }
    setName('')
    setAnchor('')
  }

  function closeEditors() {
    setEditingId(null)
    setOpenVisit(null)
    setCardError('')
  }

  function startEdit(patient: Patient) {
    closeEditors()
    setEditingId(patient.id)
    setEditName(patient.name)
    setEditNote(patient.note ?? '')
    setEditAnchor(patient.anchor_date)
    setSwitchId('')
  }

  function startVisit(patient: Patient, visit: Visit) {
    closeEditors()
    setOpenVisit({ patientId: patient.id, visitNumber: visit.visitNumber })
    setVisitDate(visit.actualDate ?? '')
    setVisitNote(visit.note ?? '')
  }

  async function savePatient(id: string, changes: PatientChanges) {
    setSaving(true)
    setCardError('')
    const saveError = await updatePatient(id, changes)
    setSaving(false)
    if (saveError) setCardError(saveError)
    else closeEditors()
  }

  async function handleSaveDetails(event: SubmitEvent<HTMLFormElement>, patient: Patient) {
    event.preventDefault()
    if (!editName.trim()) {
      setCardError('Give the patient a name or a code.')
      return
    }
    await savePatient(patient.id, { name: editName.trim(), note: editNote.trim() || null })
  }

  async function handleMoveDates(event: SubmitEvent<HTMLFormElement>, patient: Patient) {
    event.preventDefault()
    if (!editAnchor) {
      setCardError('Pick the date of the first visit.')
      return
    }
    await savePatient(patient.id, {
      anchor_date: editAnchor,
      visits: computeVisitDates(patient.visits, editAnchor),
    })
  }

  async function handleSwitch(event: SubmitEvent<HTMLFormElement>, patient: Patient) {
    event.preventDefault()
    if (!switchTo) {
      setCardError('Choose the timeline to switch to.')
      return
    }
    let message = `Switch ${patient.name} to "${switchTo.name}"? Their schedule is rebuilt from it, with the first visit on ${longDate(patient.anchor_date)}. Attendance and notes carry over by visit number.`
    if (dropped.length > 0) {
      message += ` "${switchTo.name}" has no visit ${visitNumbers(dropped)}, so what is recorded there is dropped.`
    }
    if (!window.confirm(message)) return
    await savePatient(patient.id, {
      source_timeline_id: switchTo.id,
      visits: resnapshot(patient.visits, switchTo, patient.anchor_date),
      procedures: switchTo.procedures,
    })
  }

  async function handleSaveVisit(event: SubmitEvent<HTMLFormElement>, patient: Patient, visit: Visit) {
    event.preventDefault()
    if (visitDate > today) {
      setCardError('That date is in the future. Attendance is recorded once the visit has happened.')
      return
    }
    const updated = recordActual(visit, visitDate || null)
    if (visitNote.trim()) updated.note = visitNote.trim()
    else delete updated.note
    await savePatient(patient.id, {
      visits: patient.visits.map((other) => (other.visitNumber === visit.visitNumber ? updated : other)),
    })
  }

  async function handleDelete(patient: Patient) {
    const confirmed = window.confirm(
      `Delete ${patient.name}? Their schedule, attendance and notes are removed for good.`,
    )
    if (!confirmed) return
    setListError('')
    const deleteError = await deletePatient(patient.id)
    if (deleteError) setListError(deleteError)
    else if (editingId === patient.id || openVisit?.patientId === patient.id) closeEditors()
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
    return <p className="p-6 text-sm text-slate-500">Loading patients…</p>
  }

  return (
    <div className="grid items-start gap-6 p-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={handleAdd} className="space-y-5 rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">New patient</h2>
        {timelines.length === 0 ? (
          <p className="text-sm text-slate-600">
            A patient's schedule is copied from a timeline, and you have none yet.{' '}
            <Link to="/timelines" className="font-medium text-slate-900 underline">
              Create one on the Timelines page.
            </Link>
          </p>
        ) : (
          <>
            <label className="block space-y-1">
              <span className={labelClass}>Name</span>
              <input
                className={inputClass}
                required
                placeholder="Jane Doe or P-014"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <span className="block text-xs text-slate-500">
                A real name or a code. Nothing else about the patient is stored.
              </span>
            </label>

            <label className="block space-y-1">
              <span className={labelClass}>Timeline</span>
              <select
                className={inputClass}
                required
                value={timelineId}
                onChange={(event) => setTimelineId(event.target.value)}
              >
                <option value="">Choose a timeline…</option>
                {timelines.map((timeline) => (
                  <option key={timeline.id} value={timeline.id}>
                    {timeline.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className={labelClass}>First visit date (anchor)</span>
              <input
                className={inputClass}
                type="date"
                required
                value={anchor}
                onChange={(event) => setAnchor(event.target.value)}
              />
              <span className="block text-xs text-slate-500">
                The date of the timeline's first visit. If the timeline starts before week 0, that is the screening
                date, not baseline.
              </span>
            </label>

            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <button className={buttonClass} disabled={adding}>
              {adding ? 'Adding…' : 'Add patient'}
            </button>
          </>
        )}
      </form>

      <section className="space-y-4">
        {listError && <p className="text-sm text-red-600">{listError}</p>}
        {patients.length === 0 && (
          <p className="text-sm text-slate-500">No patients yet. The ones you add appear here.</p>
        )}
        {patients.map((patient) => {
          const timeline = timelineOf(patient)
          const isEditing = editingId === patient.id
          return (
            <article
              key={patient.id}
              className={`space-y-3 rounded-xl border border-slate-200 p-5 shadow-sm ${isEditing ? 'ring-2 ring-slate-400' : ''}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full bg-slate-300"
                  style={{ backgroundColor: timeline?.color ?? undefined }}
                />
                <h3 className="min-w-0 truncate font-semibold">{patient.name}</h3>
                <span className="text-xs text-slate-500">{timeline ? timeline.name : 'no timeline'}</span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => (isEditing ? closeEditors() : startEdit(patient))}
                    className={secondaryButtonClass}
                  >
                    {isEditing ? 'Close' : 'Edit'}
                  </button>
                  <button onClick={() => handleDelete(patient)} className={secondaryButtonClass}>
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600">First visit {longDate(patient.anchor_date)}</p>
              {patient.note && <p className="text-sm text-slate-600">{patient.note}</p>}

              {isEditing && (
                <div className="space-y-4 rounded-lg bg-slate-50 p-4">
                  <form onSubmit={(event) => handleSaveDetails(event, patient)} className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block space-y-1">
                        <span className={labelClass}>Name</span>
                        <input
                          className={inputClass}
                          required
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className={labelClass}>Note</span>
                        <input
                          className={inputClass}
                          value={editNote}
                          onChange={(event) => setEditNote(event.target.value)}
                        />
                      </label>
                    </div>
                    <button className={secondaryButtonClass} disabled={saving}>
                      Save
                    </button>
                  </form>

                  <form
                    onSubmit={(event) => handleMoveDates(event, patient)}
                    className="space-y-2 border-t border-slate-200 pt-4"
                  >
                    <label className="block space-y-1 sm:w-60">
                      <span className={labelClass}>First visit date (anchor)</span>
                      <input
                        className={inputClass}
                        type="date"
                        required
                        value={editAnchor}
                        onChange={(event) => setEditAnchor(event.target.value)}
                      />
                    </label>
                    <p className="text-xs text-slate-500">
                      Every target date moves with it. Recorded attendance keeps its date and is checked against the
                      moved windows.
                    </p>
                    <button className={secondaryButtonClass} disabled={saving || editAnchor === patient.anchor_date}>
                      Move dates
                    </button>
                  </form>

                  <form
                    onSubmit={(event) => handleSwitch(event, patient)}
                    className="space-y-2 border-t border-slate-200 pt-4"
                  >
                    <label className="block space-y-1">
                      <span className={labelClass}>Switch to another timeline</span>
                      <select
                        className={inputClass}
                        value={switchId}
                        onChange={(event) => setSwitchId(event.target.value)}
                      >
                        <option value="">Choose a timeline…</option>
                        {timelines
                          .filter((other) => other.id !== patient.source_timeline_id)
                          .map((other) => (
                            <option key={other.id} value={other.id}>
                              {other.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <p className="text-xs text-slate-500">
                      The schedule is rebuilt from the new timeline, with the first visit still on{' '}
                      {longDate(patient.anchor_date)}. Attendance and notes carry over by visit number.
                    </p>
                    {dropped.length > 0 && (
                      <p className="text-sm text-slate-900">
                        Switching drops what is recorded on {visitNumbers(dropped)}.
                      </p>
                    )}
                    <button className={secondaryButtonClass} disabled={saving || !switchId}>
                      Switch
                    </button>
                  </form>

                  {cardError && <p className="text-sm text-red-600">{cardError}</p>}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm tabular-nums">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-1 font-medium">Visit</th>
                      <th className="py-1 font-medium">Target</th>
                      <th className="py-1 font-medium">Window</th>
                      <th className="py-1 font-medium">Attended</th>
                      <th className="py-1" />
                      <th className="py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {patient.visits.map((visit) => {
                      const { from, to } = windowDates(visit)
                      const status = visitStatus(visit)
                      const isOpen =
                        openVisit !== null &&
                        openVisit.patientId === patient.id &&
                        openVisit.visitNumber === visit.visitNumber
                      return (
                        <Fragment key={visit.visitNumber}>
                          <tr className="border-t border-slate-100">
                            <td className="py-1">#{visit.visitNumber}</td>
                            <td className="py-1">{longDate(visit.targetDate)}</td>
                            <td className="py-1">
                              {shortDate(from)} – {shortDate(to)}
                            </td>
                            <td className="py-1">{visit.actualDate ? longDate(visit.actualDate) : '—'}</td>
                            <td className="w-6 py-1 text-center">
                              {status === 'in-window' && <span title="In window">✓</span>}
                              {status === 'deviation' && <span title="Deviation: outside the window">⚠</span>}
                            </td>
                            <td className="py-1 text-right">
                              <button
                                onClick={() => (isOpen ? closeEditors() : startVisit(patient, visit))}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900"
                              >
                                {isOpen ? 'Close' : visit.actualDate || visit.note ? 'Edit' : 'Record'}
                              </button>
                            </td>
                          </tr>
                          {visit.note && !isOpen && (
                            <tr>
                              <td />
                              <td colSpan={5} className="pb-1 text-slate-600">
                                {visit.note}
                              </td>
                            </tr>
                          )}
                          {isOpen && (
                            <tr>
                              <td colSpan={6} className="pb-3">
                                <form
                                  onSubmit={(event) => handleSaveVisit(event, patient, visit)}
                                  className="space-y-2 rounded-lg bg-slate-50 p-3"
                                >
                                  <div className="flex flex-wrap items-end gap-2">
                                    <label className="block space-y-1">
                                      <span className={labelClass}>Attended on</span>
                                      <input
                                        className={inputClass}
                                        type="date"
                                        max={today}
                                        value={visitDate}
                                        onChange={(event) => setVisitDate(event.target.value)}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => setVisitDate('')}
                                      className={secondaryButtonClass}
                                    >
                                      Clear date
                                    </button>
                                  </div>
                                  <label className="block space-y-1">
                                    <span className={labelClass}>Note</span>
                                    <input
                                      className={inputClass}
                                      value={visitNote}
                                      onChange={(event) => setVisitNote(event.target.value)}
                                    />
                                  </label>
                                  {cardError && <p className="text-sm text-red-600">{cardError}</p>}
                                  <div className="flex gap-2">
                                    <button className={buttonClass} disabled={saving}>
                                      {saving ? 'Saving…' : 'Save'}
                                    </button>
                                    <button type="button" onClick={closeEditors} className={secondaryButtonClass}>
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
