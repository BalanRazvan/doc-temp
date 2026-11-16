import { useState } from 'react'
import { buildBackup, importRows, readBackup } from '../lib/backup.ts'
import type { BackupFile, ImportRows } from '../lib/backup.ts'
import { longDate, toISO } from '../lib/schedule.ts'
import { useStore } from '../lib/store.ts'
import { supabase } from '../lib/supabase.ts'
import { buttonClass, secondaryButtonClass } from '../lib/ui.ts'

const cardClass = 'space-y-3 rounded-xl border border-slate-200 p-5 shadow-sm'

function count(timelines: number, patients: number, procedureSets: number, savedArticles: number): string {
  return [
    `${timelines} ${timelines === 1 ? 'timeline' : 'timelines'}`,
    `${patients} ${patients === 1 ? 'patient' : 'patients'}`,
    `${procedureSets} ${procedureSets === 1 ? 'procedure set' : 'procedure sets'}`,
    `${savedArticles} ${savedArticles === 1 ? 'saved article' : 'saved articles'}`,
  ].join(', ')
}

async function insert(table: string, rows: object[]): Promise<string | null> {
  if (rows.length === 0) return null
  const result = await supabase.from(table).insert(rows)
  if (result.error) return result.error.message
  return null
}

async function insertAll(rows: ImportRows): Promise<string | null> {
  const timelinesError = await insert('timelines', rows.timelines)
  if (timelinesError) return `The timelines failed, so nothing was written: ${timelinesError}`
  const patientsError = await insert('patients', rows.patients)
  if (patientsError) return `Timelines imported. The patients failed, so nothing after them was written: ${patientsError}`
  const setsError = await insert('procedure_sets', rows.procedureSets)
  if (setsError) {
    return `Timelines and patients imported. The procedure sets failed, so nothing after them was written: ${setsError}`
  }
  const articlesError = await insert('saved_articles', rows.savedArticles)
  if (articlesError) return `Timelines, patients and procedure sets imported. The saved articles failed: ${articlesError}`
  return null
}

export default function Backup() {
  const timelines = useStore((state) => state.timelines)
  const timelinesStatus = useStore((state) => state.timelinesStatus)
  const loadTimelines = useStore((state) => state.loadTimelines)
  const patients = useStore((state) => state.patients)
  const patientsStatus = useStore((state) => state.patientsStatus)
  const loadPatients = useStore((state) => state.loadPatients)
  const procedureSets = useStore((state) => state.procedureSets)
  const procedureSetsStatus = useStore((state) => state.procedureSetsStatus)
  const loadProcedureSets = useStore((state) => state.loadProcedureSets)
  const savedArticles = useStore((state) => state.savedArticles)
  const savedArticlesStatus = useStore((state) => state.savedArticlesStatus)
  const loadSavedArticles = useStore((state) => state.loadSavedArticles)

  const [backup, setBackup] = useState<BackupFile | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [imported, setImported] = useState('')

  function retry() {
    if (timelinesStatus === 'error') loadTimelines()
    if (patientsStatus === 'error') loadPatients()
    if (procedureSetsStatus === 'error') loadProcedureSets()
    if (savedArticlesStatus === 'error') loadSavedArticles()
  }

  function download() {
    const today = toISO(new Date())
    const file = buildBackup(timelines, patients, procedureSets, savedArticles, today)
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `doctor-schedule-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function chooseFile(file: File | undefined) {
    setBackup(null)
    setProblem('')
    setImported('')
    if (!file) return
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setProblem('This file is not JSON, so it is not a backup made by this app.')
      return
    }
    const read = readBackup(parsed)
    if (typeof read === 'string') setProblem(read)
    else setBackup(read)
  }

  async function handleImport() {
    if (!backup) return
    setBusy(true)
    setProblem('')
    const error = await insertAll(importRows(backup, () => crypto.randomUUID()))
    setBusy(false)
    setBackup(null)
    if (error) setProblem(error)
    else {
      const holds = count(
        backup.timelines.length,
        backup.patients.length,
        backup.procedureSets.length,
        backup.savedArticles.length,
      )
      setImported(`Imported ${holds}.`)
    }
    loadTimelines()
    loadPatients()
    loadProcedureSets()
    loadSavedArticles()
  }

  if (
    timelinesStatus === 'error' ||
    patientsStatus === 'error' ||
    procedureSetsStatus === 'error' ||
    savedArticlesStatus === 'error'
  ) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-md space-y-3 rounded-xl border border-slate-200 p-5">
          {timelinesStatus === 'error' && <p className="text-sm text-red-600">Couldn't load your timelines.</p>}
          {patientsStatus === 'error' && <p className="text-sm text-red-600">Couldn't load your patients.</p>}
          {procedureSetsStatus === 'error' && <p className="text-sm text-red-600">Couldn't load your procedure sets.</p>}
          {savedArticlesStatus === 'error' && <p className="text-sm text-red-600">Couldn't load your saved articles.</p>}
          <p className="text-sm text-slate-600">Export and import wait until everything has loaded, so a backup never leaves anything out.</p>
          <button onClick={retry} className={secondaryButtonClass}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (
    timelinesStatus !== 'ready' ||
    patientsStatus !== 'ready' ||
    procedureSetsStatus !== 'ready' ||
    savedArticlesStatus !== 'ready'
  ) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Loading your account…</p>
  }

  const holds = count(timelines.length, patients.length, procedureSets.length, savedArticles.length)
  const empty =
    timelines.length === 0 && patients.length === 0 && procedureSets.length === 0 && savedArticles.length === 0

  return (
    <div className="max-w-2xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Backup</h1>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold">Export</h2>
        <p className="text-sm text-slate-600">
          Downloads everything in this account as one JSON file: {holds}. The database keeps no backups of its own, so
          this file is the only copy outside the app. It holds your patients' names and notes: keep it as carefully as
          a paper file.
        </p>
        <button onClick={download} className={buttonClass}>
          Download backup
        </button>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold">Import</h2>
        {imported && <p className="text-sm text-slate-700">{imported}</p>}
        {!imported && !empty && (
          <p className="text-sm text-slate-600">
            Import works only in an empty account, so nothing is mixed in or overwritten. This account holds {holds}.
          </p>
        )}
        {empty && (
          <>
            <p className="text-sm text-slate-600">
              Loads a backup made on this page into this account. Choosing a file only reads it; nothing is written
              until you press Import.
            </p>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => chooseFile(event.target.files?.[0])}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
            />
          </>
        )}
        {problem && <p className="text-sm break-words text-red-600">{problem}</p>}
        {backup && (
          <>
            <p className="text-sm text-slate-700">
              This file holds{' '}
              {count(
                backup.timelines.length,
                backup.patients.length,
                backup.procedureSets.length,
                backup.savedArticles.length,
              )}
              , exported {longDate(backup.exportedAt)}.
            </p>
            <button onClick={handleImport} disabled={busy} className={buttonClass}>
              {busy ? 'Importing…' : 'Import'}
            </button>
          </>
        )}
      </section>
    </div>
  )
}
