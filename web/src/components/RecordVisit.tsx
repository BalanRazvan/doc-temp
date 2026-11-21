import { useState } from 'react'
import type { SubmitEvent } from 'react'
import StatusBadge from './StatusBadge.tsx'
import { isBooked, recordActual, statusWords, toISO, visitStatus, windowWords } from '../lib/schedule.ts'
import { useStore } from '../lib/store.ts'
import type { Patient, Visit } from '../lib/types.ts'
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from '../lib/ui.ts'

type Props = {
  patient: Patient
  visit: Visit
  onCancel: () => void
  onSaved: () => void
}

export default function RecordVisit({ patient, visit, onCancel, onSaved }: Props) {
  const updatePatient = useStore((state) => state.updatePatient)

  const [date, setDate] = useState(visit.actualDate ?? '')
  const [note, setNote] = useState(visit.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = toISO(new Date())
  const preview = recordActual(visit, date || null)
  const previewStatus = visitStatus(preview)
  const previewBooked = isBooked(preview, today)
  const previewWords = date ? windowWords(preview, today) : ''

  async function handleSave(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const updated = recordActual(visit, date || null)
    if (note.trim()) updated.note = note.trim()
    else delete updated.note
    setSaving(true)
    setError('')
    const saveError = await updatePatient(patient.id, {
      visits: patient.visits.map((other) => (other.visitNumber === visit.visitNumber ? updated : other)),
    })
    setSaving(false)
    if (saveError) setError(saveError)
    else onSaved()
  }

  return (
    <form onSubmit={handleSave} className="space-y-2 rounded-lg bg-slate-50 p-3 transition-opacity starting:opacity-0">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block space-y-1">
          <span className={labelClass}>Attended on</span>
          <input
            className={inputClass}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <button type="button" onClick={() => setDate(today)} className={secondaryButtonClass}>
          Today
        </button>
        <button type="button" onClick={() => setDate('')} className={secondaryButtonClass}>
          Clear date
        </button>
      </div>
      <p className="flex items-baseline gap-1.5 text-sm text-slate-700">
        <StatusBadge status={previewStatus} booked={previewBooked} />
        <span>
          {statusWords(previewStatus)}
          {previewWords && ` · ${previewWords}`}
          {previewBooked && ' · booked'}
        </span>
      </p>
      <label className="block space-y-1">
        <span className={labelClass}>Note</span>
        <input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button className={buttonClass} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  )
}
