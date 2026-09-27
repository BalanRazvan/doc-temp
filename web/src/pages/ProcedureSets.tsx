import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { namesFromLines, repeatedName } from '../lib/schedule.ts'
import { useStore } from '../lib/store.ts'
import type { ProcedureSet } from '../lib/types.ts'
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from '../lib/ui.ts'

export default function ProcedureSets() {
  const procedureSets = useStore((state) => state.procedureSets)
  const procedureSetsStatus = useStore((state) => state.procedureSetsStatus)
  const loadProcedureSets = useStore((state) => state.loadProcedureSets)
  const addProcedureSet = useStore((state) => state.addProcedureSet)
  const updateProcedureSet = useStore((state) => state.updateProcedureSet)
  const deleteProcedureSet = useStore((state) => state.deleteProcedureSet)

  const [editing, setEditing] = useState<ProcedureSet | null>(null)
  const [name, setName] = useState('')
  const [lines, setLines] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')

  function startNew() {
    setEditing(null)
    setName('')
    setLines('')
    setError('')
  }

  function startEdit(procedureSet: ProcedureSet) {
    setEditing(procedureSet)
    setName(procedureSet.name)
    setLines(procedureSet.procedures.join('\n'))
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the set a name.')
      return
    }
    const names = namesFromLines(lines)
    if (names.length === 0) {
      setError('Add at least one procedure, one per line.')
      return
    }
    const repeat = repeatedName(names)
    if (repeat) {
      setError(`Two procedures are both called "${repeat}".`)
      return
    }
    setBusy(true)
    setError('')
    const saveError = editing
      ? await updateProcedureSet(editing.id, { name: name.trim(), procedures: names })
      : await addProcedureSet({ name: name.trim(), procedures: names })
    setBusy(false)
    if (saveError) setError(saveError)
    else startNew()
  }

  async function handleDelete(procedureSet: ProcedureSet) {
    const message = `Delete the set "${procedureSet.name}"? Timelines it was applied to keep their procedures: applying copies the names, and nothing links back to the set.`
    if (!window.confirm(message)) return
    setListError('')
    const deleteError = await deleteProcedureSet(procedureSet.id)
    if (deleteError) setListError(deleteError)
    else if (editing?.id === procedureSet.id) startNew()
  }

  return (
    <div className="grid items-start gap-6 p-6 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className={`min-w-0 space-y-5 rounded-xl border border-slate-200 p-6 shadow-sm ${editing ? 'ring-2 ring-slate-400' : ''}`}
      >
        <h2 className="text-lg font-semibold">{editing ? 'Edit procedure set' : 'New procedure set'}</h2>

        {editing && (
          <p className="text-sm text-slate-600">
            Timelines this set was applied to keep their own procedures. These changes only reach timelines you apply
            it to after saving.
          </p>
        )}

        <label className="block space-y-1">
          <span className={labelClass}>Name</span>
          <input
            className={inputClass}
            required
            placeholder="Standard visit"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className={labelClass}>Procedures, one per line</span>
          <textarea
            className={`${inputClass} resize-y`}
            rows={8}
            placeholder={'Vitals\nBloods\nECG'}
            value={lines}
            onChange={(event) => setLines(event.target.value)}
          />
          <span className="block text-xs text-slate-500">Blank lines are ignored.</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className={buttonClass} disabled={busy || procedureSetsStatus !== 'ready'}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create set'}
          </button>
          {editing && (
            <button type="button" onClick={startNew} className={secondaryButtonClass}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="space-y-4">
        {(procedureSetsStatus === 'idle' || procedureSetsStatus === 'loading') && (
          <p className="text-sm text-slate-500">Loading procedure sets…</p>
        )}
        {procedureSetsStatus === 'error' && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-red-600">Couldn't load your procedure sets.</p>
            <button onClick={loadProcedureSets} className={secondaryButtonClass}>
              Try again
            </button>
          </div>
        )}
        {procedureSetsStatus === 'ready' && procedureSets.length === 0 && (
          <p className="text-sm text-slate-500">No procedure sets yet. The ones you create appear here.</p>
        )}
        {listError && <p className="text-sm text-red-600">{listError}</p>}
        {procedureSetsStatus === 'ready' &&
          procedureSets.map((procedureSet) => (
            <article
              key={procedureSet.id}
              className={`space-y-2 rounded-xl border border-slate-200 p-5 shadow-sm ${editing?.id === procedureSet.id ? 'ring-2 ring-slate-400' : ''}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 truncate font-semibold">{procedureSet.name}</h3>
                <span className="text-xs text-slate-500">
                  {procedureSet.procedures.length} {procedureSet.procedures.length === 1 ? 'procedure' : 'procedures'}
                </span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => startEdit(procedureSet)} className={secondaryButtonClass}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(procedureSet)} className={secondaryButtonClass}>
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600">{procedureSet.procedures.join(' · ')}</p>
            </article>
          ))}
      </section>
    </div>
  )
}
