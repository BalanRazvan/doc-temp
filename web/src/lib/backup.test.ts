import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBackup, importRows, readBackup } from './backup.ts'
import type { BackupFile } from './backup.ts'
import type { Patient, ProcedureSet, SavedArticle, Timeline } from './types.ts'

const timelines: Timeline[] = [
  {
    id: 't1',
    user_id: 'u1',
    name: 'Oncology A',
    color: 'hsl(0 70% 50%)',
    visits: [
      { visitNumber: 1, week: 0, window: 3, procedures: ['p1'] },
      { visitNumber: 2, week: 4, window: 3, procedures: ['p1', 'p2'] },
    ],
    procedures: [
      { id: 'p1', name: 'Vitals' },
      { id: 'p2', name: 'Bloods' },
    ],
    created_at: '2026-09-01T08:00:00.123456+00:00',
  },
  {
    id: 't2',
    user_id: 'u1',
    name: 'Cardiology B',
    color: null,
    visits: [],
    procedures: [],
    created_at: '2026-09-02T08:00:00+00:00',
  },
]

const patients: Patient[] = [
  {
    id: 'pat1',
    user_id: 'u1',
    name: 'P-014',
    anchor_date: '2026-10-14',
    source_timeline_id: 't1',
    visits: [
      {
        visitNumber: 1,
        week: 0,
        window: 3,
        procedures: ['p1'],
        targetDate: '2026-10-14',
        actualDate: '2026-10-19',
        note: 'Came late: flu.',
      },
      { visitNumber: 2, week: 4, window: 3, procedures: ['p1', 'p2'], targetDate: '2026-11-11' },
    ],
    procedures: [
      { id: 'p1', name: 'Vitals' },
      { id: 'p2', name: 'Bloods' },
    ],
    note: 'Prefers mornings.',
    created_at: '2026-10-01T09:30:00+00:00',
  },
  {
    id: 'pat2',
    user_id: 'u1',
    name: 'Ana',
    anchor_date: '2026-03-29',
    source_timeline_id: null,
    visits: [],
    procedures: [],
    note: null,
    created_at: '2026-10-02T09:30:00+00:00',
  },
]

const procedureSets: ProcedureSet[] = [
  { id: 's1', user_id: 'u1', name: 'Standard', procedures: ['Vitals', 'Bloods'], created_at: '2026-08-01T10:00:00+00:00' },
]

const savedArticles: SavedArticle[] = [
  {
    id: 'a1',
    user_id: 'u1',
    source: 'europepmc',
    external_id: 'MED:42737027',
    title: 'apoE<sup>-/-</sup> mice',
    authors: 'Musik S, Zalewski J.',
    journal: 'Healthcare (Basel, Switzerland)',
    year: 2026,
    abstract: '<h4>Background</h4>Slow (p &lt; 0.05).',
    url: 'https://europepmc.org/article/MED/42737027',
    note: 'Read for the methods.',
    saved_at: '2026-11-02T12:00:00+00:00',
  },
  {
    id: 'a2',
    user_id: 'u1',
    source: 'europepmc',
    external_id: 'PPR:PPR1324813',
    title: 'Beyond Statistical Similarity',
    authors: null,
    journal: null,
    year: null,
    abstract: null,
    url: null,
    note: null,
    saved_at: '2026-11-01T12:00:00+00:00',
  },
]

const exported = buildBackup(timelines, patients, procedureSets, savedArticles, '2026-11-16')

function throughFile(backup: BackupFile): unknown {
  return JSON.parse(JSON.stringify(backup, null, 2))
}

test('the backup holds every row as the store holds it, without user_id, and with an id only on timelines', () => {
  assert.deepEqual(exported, {
    version: 1,
    exportedAt: '2026-11-16',
    timelines: [
      {
        id: 't1',
        name: 'Oncology A',
        color: 'hsl(0 70% 50%)',
        visits: timelines[0].visits,
        procedures: timelines[0].procedures,
        created_at: '2026-09-01T08:00:00.123456+00:00',
      },
      { id: 't2', name: 'Cardiology B', color: null, visits: [], procedures: [], created_at: '2026-09-02T08:00:00+00:00' },
    ],
    patients: [
      {
        name: 'P-014',
        anchor_date: '2026-10-14',
        source_timeline_id: 't1',
        visits: patients[0].visits,
        procedures: patients[0].procedures,
        note: 'Prefers mornings.',
        created_at: '2026-10-01T09:30:00+00:00',
      },
      {
        name: 'Ana',
        anchor_date: '2026-03-29',
        source_timeline_id: null,
        visits: [],
        procedures: [],
        note: null,
        created_at: '2026-10-02T09:30:00+00:00',
      },
    ],
    procedureSets: [{ name: 'Standard', procedures: ['Vitals', 'Bloods'], created_at: '2026-08-01T10:00:00+00:00' }],
    savedArticles: [
      {
        source: 'europepmc',
        external_id: 'MED:42737027',
        title: 'apoE<sup>-/-</sup> mice',
        authors: 'Musik S, Zalewski J.',
        journal: 'Healthcare (Basel, Switzerland)',
        year: 2026,
        abstract: '<h4>Background</h4>Slow (p &lt; 0.05).',
        url: 'https://europepmc.org/article/MED/42737027',
        note: 'Read for the methods.',
        saved_at: '2026-11-02T12:00:00+00:00',
      },
      {
        source: 'europepmc',
        external_id: 'PPR:PPR1324813',
        title: 'Beyond Statistical Similarity',
        authors: null,
        journal: null,
        year: null,
        abstract: null,
        url: null,
        note: null,
        saved_at: '2026-11-01T12:00:00+00:00',
      },
    ],
  })
  const file = JSON.stringify(exported)
  assert.equal(file.includes('user_id'), false)
  assert.equal(file.includes('"u1"'), false)
  for (const id of ['pat1', 'pat2', 's1', 'a1', 'a2']) assert.equal(file.includes(`"${id}"`), false, id)
})

test('a backup written to a file and read back is exactly the backup, notes, dates and colours included', () => {
  assert.deepEqual(readBackup(throughFile(exported)), exported)
})

test('an empty account makes a backup that reads back as empty', () => {
  const empty = buildBackup([], [], [], [], '2026-11-16')
  assert.deepEqual(readBackup(throughFile(empty)), {
    version: 1,
    exportedAt: '2026-11-16',
    timelines: [],
    patients: [],
    procedureSets: [],
    savedArticles: [],
  })
})

test('text is read back as it was written: no trimming, and blank strings stay blank', () => {
  const procedure = { id: 'p9', name: '' }
  const timeline = { ...exported.timelines[0], name: '  Oncology A ', procedures: [procedure] }
  const patient = { ...exported.patients[0], note: '' }
  const backup = { ...exported, timelines: [timeline], patients: [patient] }
  assert.deepEqual(readBackup(throughFile(backup)), backup)
})

test('a file that is not a backup is turned down', () => {
  const message = 'This file is not a backup made by this app.'
  assert.equal(readBackup('hello'), message)
  assert.equal(readBackup(null), message)
  assert.equal(readBackup([]), message)
  assert.equal(readBackup({ timelines: [] }), message)
  assert.equal(readBackup({ ...exported, version: '1' }), message)
})

test('a backup of another version is turned down, saying which', () => {
  assert.equal(readBackup({ ...exported, version: 2 }), 'This backup is version 2, and this app reads only version 1.')
})

test('a backup with no export date, or one that is not a day, is turned down', () => {
  const message = 'The backup has no valid export date.'
  assert.equal(readBackup({ ...exported, exportedAt: undefined }), message)
  assert.equal(readBackup({ ...exported, exportedAt: '2026-11-16T10:00:00Z' }), message)
})

test('a backup missing any of its four lists is turned down, naming the list', () => {
  assert.equal(readBackup({ ...exported, timelines: undefined }), 'The backup has no list of timelines.')
  assert.equal(readBackup({ ...exported, patients: {} }), 'The backup has no list of patients.')
  assert.equal(readBackup({ ...exported, procedureSets: null }), 'The backup has no list of procedure sets.')
  assert.equal(readBackup({ ...exported, savedArticles: 'none' }), 'The backup has no list of saved articles.')
})

test('a timeline missing a field a page reads is turned down, naming the timeline and the field', () => {
  const good = exported.timelines[0]
  function withTimeline(timeline: unknown): unknown {
    return { ...exported, timelines: [good, timeline] }
  }
  assert.equal(readBackup(withTimeline({ ...good, id: undefined })), 'Timeline 2 has no id.')
  assert.equal(readBackup(withTimeline({ ...good, name: 7 })), 'Timeline 2 has no name.')
  assert.equal(readBackup(withTimeline({ ...good, color: undefined })), 'Timeline 2 has a colour that is not text.')
  assert.equal(readBackup(withTimeline({ ...good, visits: undefined })), 'Timeline 2 has visits that cannot be read.')
  assert.equal(readBackup(withTimeline({ ...good, procedures: undefined })), 'Timeline 2 has procedures that cannot be read.')
  assert.equal(readBackup(withTimeline({ ...good, created_at: 'yesterday' })), 'Timeline 2 has no valid creation time.')
  assert.equal(readBackup(withTimeline('Oncology A')), 'Timeline 2 has no id.')
})

test("a timeline's visit whose week, window or number is not a number is turned down", () => {
  const good = exported.timelines[0]
  const visit = good.visits[0]
  function withVisit(changed: unknown): unknown {
    return { ...exported, timelines: [{ ...good, visits: [visit, changed] }] }
  }
  const message = 'Timeline 1 has visits that cannot be read.'
  assert.equal(readBackup(withVisit({ ...visit, week: '4' })), message)
  assert.equal(readBackup(withVisit({ ...visit, window: null })), message)
  assert.equal(readBackup(withVisit({ ...visit, visitNumber: undefined })), message)
  assert.equal(readBackup(withVisit({ ...visit, procedures: [1] })), message)
  assert.equal(readBackup(withVisit({ ...visit, procedures: undefined })), message)
  assert.equal(readBackup(withVisit(null)), message)
})

test("a timeline's procedure without a text id and name is turned down", () => {
  const good = exported.timelines[0]
  const message = 'Timeline 1 has procedures that cannot be read.'
  assert.equal(readBackup({ ...exported, timelines: [{ ...good, procedures: [{ id: 1, name: 'Vitals' }] }] }), message)
  assert.equal(readBackup({ ...exported, timelines: [{ ...good, procedures: [{ id: 'p1' }] }] }), message)
  assert.equal(readBackup({ ...exported, timelines: [{ ...good, procedures: ['Vitals'] }] }), message)
})

test('a patient missing a field a page reads is turned down, naming the patient and the field', () => {
  const good = exported.patients[0]
  function withPatient(patient: unknown): unknown {
    return { ...exported, patients: [good, patient] }
  }
  assert.equal(readBackup(withPatient({ ...good, name: undefined })), 'Patient 2 has no name.')
  assert.equal(readBackup(withPatient({ ...good, anchor_date: undefined })), 'Patient 2 has no valid anchor date.')
  assert.equal(
    readBackup(withPatient({ ...good, source_timeline_id: undefined })),
    'Patient 2 has a timeline id that is not text.',
  )
  assert.equal(readBackup(withPatient({ ...good, visits: undefined })), 'Patient 2 has visits that cannot be read.')
  assert.equal(readBackup(withPatient({ ...good, procedures: [{ id: 'p1' }] })), 'Patient 2 has procedures that cannot be read.')
  assert.equal(readBackup(withPatient({ ...good, note: 5 })), 'Patient 2 has a note that is not text.')
  assert.equal(readBackup(withPatient({ ...good, created_at: undefined })), 'Patient 2 has no valid creation time.')
})

test('an anchor date that is not YYYY-MM-DD, or not a day that exists, is turned down', () => {
  const good = exported.patients[0]
  const message = 'Patient 1 has no valid anchor date.'
  for (const anchor of ['14/10/2026', '2026-10-14T12:00:00Z', '2026-1-4', '20261-10-14', '2026-02-30', '2026-13-01', '']) {
    assert.equal(readBackup({ ...exported, patients: [{ ...good, anchor_date: anchor }] }), message, anchor)
  }
  assert.notEqual(readBackup({ ...exported, patients: [{ ...good, anchor_date: '2028-02-29' }] }), message)
})

test("a patient's visit with a bad week, target date, attended date or note is turned down", () => {
  const good = exported.patients[0]
  const attended = good.visits[0]
  const planned = good.visits[1]
  function withVisit(changed: unknown): unknown {
    return { ...exported, patients: [{ ...good, visits: [planned, changed] }] }
  }
  const message = 'Patient 1 has visits that cannot be read.'
  assert.equal(readBackup(withVisit({ ...attended, week: '0' })), message)
  assert.equal(readBackup(withVisit({ ...attended, targetDate: undefined })), message)
  assert.equal(readBackup(withVisit({ ...attended, targetDate: '2026-10-32' })), message)
  assert.equal(readBackup(withVisit({ ...attended, actualDate: '19 Oct 2026' })), message)
  assert.equal(readBackup(withVisit({ ...attended, actualDate: null })), message)
  assert.equal(readBackup(withVisit({ ...attended, note: null })), message)
  assert.equal(readBackup(withVisit({ ...attended, procedures: 'p1' })), message)
})

test("a patient's visit keeps an attended date and a note when it has them, and gains neither when it has not", () => {
  const read = readBackup(throughFile(exported))
  if (typeof read === 'string') throw new Error(read)
  assert.deepEqual(read.patients[0].visits[0], {
    visitNumber: 1,
    week: 0,
    window: 3,
    procedures: ['p1'],
    targetDate: '2026-10-14',
    actualDate: '2026-10-19',
    note: 'Came late: flu.',
  })
  assert.equal('actualDate' in read.patients[0].visits[1], false)
  assert.equal('note' in read.patients[0].visits[1], false)
})

test('a procedure set missing a field is turned down', () => {
  const good = exported.procedureSets[0]
  assert.equal(readBackup({ ...exported, procedureSets: [{ ...good, name: null }] }), 'Procedure set 1 has no name.')
  assert.equal(
    readBackup({ ...exported, procedureSets: [{ ...good, procedures: [{ id: 'p1', name: 'Vitals' }] }] }),
    'Procedure set 1 has procedures that cannot be read.',
  )
  assert.equal(
    readBackup({ ...exported, procedureSets: [{ ...good, created_at: undefined }] }),
    'Procedure set 1 has no valid creation time.',
  )
})

test('a saved article missing a field, or with a year that is not a whole number, is turned down', () => {
  const good = exported.savedArticles[0]
  function withArticle(article: unknown): unknown {
    return { ...exported, savedArticles: [good, article] }
  }
  assert.equal(readBackup(withArticle({ ...good, source: undefined })), 'Saved article 2 has no source and id.')
  assert.equal(readBackup(withArticle({ ...good, external_id: 42737027 })), 'Saved article 2 has no source and id.')
  assert.equal(readBackup(withArticle({ ...good, title: undefined })), 'Saved article 2 has no title.')
  assert.equal(readBackup(withArticle({ ...good, authors: ['Musik S'] })), 'Saved article 2 has authors that are not text.')
  assert.equal(readBackup(withArticle({ ...good, journal: undefined })), 'Saved article 2 has a journal that is not text.')
  assert.equal(readBackup(withArticle({ ...good, year: '2026' })), 'Saved article 2 has a year that is not a whole number.')
  assert.equal(readBackup(withArticle({ ...good, year: 2026.5 })), 'Saved article 2 has a year that is not a whole number.')
  assert.equal(readBackup(withArticle({ ...good, abstract: 1 })), 'Saved article 2 has an abstract that is not text.')
  assert.equal(readBackup(withArticle({ ...good, url: undefined })), 'Saved article 2 has a link that is not text.')
  assert.equal(readBackup(withArticle({ ...good, note: false })), 'Saved article 2 has a note that is not text.')
  assert.equal(readBackup(withArticle({ ...good, saved_at: 'now' })), 'Saved article 2 has no valid time it was saved.')
})

test('import gives each timeline a new id and points its patients at it', () => {
  let made = 0
  const rows = importRows(exported, () => `new-${++made}`)
  assert.deepEqual(
    rows.timelines.map((timeline) => timeline.id),
    ['new-1', 'new-2'],
  )
  assert.equal(rows.patients[0].source_timeline_id, 'new-1')
  assert.deepEqual(rows.timelines[0], { ...exported.timelines[0], id: 'new-1' })
  assert.deepEqual(rows.patients[0], { ...exported.patients[0], source_timeline_id: 'new-1' })
})

test('a patient whose timeline is not in the file, or who has none, is imported with no timeline', () => {
  const backup = {
    ...exported,
    patients: [
      { ...exported.patients[0], source_timeline_id: 't-deleted' },
      { ...exported.patients[0], source_timeline_id: 't2' },
      exported.patients[1],
    ],
  }
  let made = 0
  const rows = importRows(backup, () => `new-${++made}`)
  assert.deepEqual(
    rows.patients.map((patient) => patient.source_timeline_id),
    [null, 'new-2', null],
  )
})

test('import keeps every other column as the file has it, including the times that order the lists', () => {
  const rows = importRows(exported, () => 'new')
  assert.deepEqual(
    rows.timelines.map((timeline) => [timeline.name, timeline.color, timeline.created_at]),
    [
      ['Oncology A', 'hsl(0 70% 50%)', '2026-09-01T08:00:00.123456+00:00'],
      ['Cardiology B', null, '2026-09-02T08:00:00+00:00'],
    ],
  )
  assert.deepEqual(rows.patients[1], exported.patients[1])
  assert.deepEqual(rows.procedureSets, exported.procedureSets)
  assert.deepEqual(rows.savedArticles, exported.savedArticles)
  assert.equal(JSON.stringify(rows).includes('user_id'), false)
})

test('import leaves the backup it was handed unchanged', () => {
  const backup = buildBackup(timelines, patients, procedureSets, savedArticles, '2026-11-16')
  const before = JSON.stringify(backup)
  importRows(backup, () => 'new')
  assert.equal(JSON.stringify(backup), before)
})
