import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSummary } from './summary.ts'
import type { DayVisit } from './schedule.ts'
import type { Patient, Timeline, Visit } from './types.ts'

const today = '2026-09-28'

function visit(visitNumber: number, targetDate: string, window: number, actualDate?: string): Visit {
  const made: Visit = { visitNumber, week: 0, window, targetDate, procedures: [] }
  if (actualDate) made.actualDate = actualDate
  return made
}

function patient(name: string, timelineId: string | null, visits: Visit[]): Patient {
  return {
    id: name,
    user_id: 'u1',
    name,
    anchor_date: visits.length > 0 ? visits[0].targetDate : today,
    source_timeline_id: timelineId,
    visits,
    procedures: [],
    note: null,
    created_at: '2026-01-01T00:00:00Z',
  }
}

function timeline(id: string): Timeline {
  return {
    id,
    user_id: 'u1',
    name: `Protocol ${id}`,
    color: null,
    visits: [],
    procedures: [],
    created_at: '2026-01-01T00:00:00Z',
  }
}

function labels(list: DayVisit[]): string[] {
  return list.map(({ patient, visit }) => `${patient.name} #${visit.visitNumber}`)
}

test('a visit targeted from today to six days ahead is due this week, and not yesterday or seven days ahead', () => {
  const ana = patient('Ana', 't1', [
    visit(1, '2026-09-27', 3),
    visit(2, '2026-09-28', 3),
    visit(3, '2026-10-04', 3),
    visit(4, '2026-10-05', 3),
  ])
  const summary = buildSummary([ana], [timeline('t1')], today)
  assert.deepEqual(labels(summary.dueThisWeek), ['Ana #2', 'Ana #3'])
})

test('due this week still ends six days ahead across the October daylight saving change', () => {
  const ana = patient('Ana', 't1', [visit(1, '2026-10-28', 3), visit(2, '2026-10-29', 3)])
  const summary = buildSummary([ana], [timeline('t1')], '2026-10-22')
  assert.deepEqual(labels(summary.dueThisWeek), ['Ana #1'])
})

test('due this week still ends six days ahead across the March daylight saving change', () => {
  const ana = patient('Ana', 't1', [visit(1, '2027-03-31', 3), visit(2, '2027-04-01', 3)])
  const summary = buildSummary([ana], [timeline('t1')], '2027-03-25')
  assert.deepEqual(labels(summary.dueThisWeek), ['Ana #1'])
})

test('a window closing today is closing soon, and one that closed yesterday is overdue', () => {
  const ana = patient('Ana', 't1', [visit(1, '2026-09-25', 3), visit(2, '2026-09-24', 3)])
  const summary = buildSummary([ana], [timeline('t1')], today)
  assert.deepEqual(labels(summary.closingSoon), ['Ana #1'])
  assert.deepEqual(labels(summary.overdue), ['Ana #2'])
})

test('closing soon runs from today to three days ahead, both ends included', () => {
  const ana = patient('Ana', 't1', [
    visit(1, '2026-09-28', 0),
    visit(2, '2026-10-01', 0),
    visit(3, '2026-10-02', 0),
  ])
  const summary = buildSummary([ana], [timeline('t1')], today)
  assert.deepEqual(labels(summary.closingSoon), ['Ana #1', 'Ana #2'])
})

test('closing soon still ends three days ahead across the October daylight saving change', () => {
  const ana = patient('Ana', 't1', [visit(1, '2026-10-26', 1), visit(2, '2026-10-27', 1)])
  const summary = buildSummary([ana], [timeline('t1')], '2026-10-24')
  assert.deepEqual(labels(summary.closingSoon), ['Ana #1'])
})

test('attendance on either edge of the window is not a deviation, and a day outside either edge is', () => {
  const ana = patient('Ana', 't1', [
    visit(1, '2026-09-10', 3, '2026-09-07'),
    visit(2, '2026-09-17', 3, '2026-09-20'),
    visit(3, '2026-08-10', 3, '2026-08-06'),
    visit(4, '2026-08-17', 3, '2026-08-21'),
  ])
  const summary = buildSummary([ana], [timeline('t1')], today)
  assert.deepEqual(labels(summary.deviations), ['Ana #4', 'Ana #3'])
})

test('a recorded visit is on no to-do list, whether it was in its window or a deviation', () => {
  const ana = patient('Ana', 't1', [
    visit(1, '2026-09-18', 2, '2026-09-23'),
    visit(2, '2026-09-28', 0, '2026-09-28'),
    visit(3, '2026-09-30', 3, '2026-09-27'),
  ])
  const summary = buildSummary([ana], [timeline('t1')], today)
  assert.deepEqual(summary.dueThisWeek, [])
  assert.deepEqual(summary.closingSoon, [])
  assert.deepEqual(summary.overdue, [])
  assert.deepEqual(labels(summary.deviations), ['Ana #1'])
})

test('a visit with only a note is not recorded, so it stays on the to-do lists', () => {
  const noted = { ...visit(1, '2026-09-28', 0), note: 'phoned, coming Monday' }
  const summary = buildSummary([patient('Ana', 't1', [noted])], [timeline('t1')], today)
  assert.deepEqual(labels(summary.dueThisWeek), ['Ana #1'])
  assert.deepEqual(labels(summary.closingSoon), ['Ana #1'])
  assert.equal(summary.counts.recorded, 0)
})

test('a tight window due this week is on both This week and closing soon', () => {
  const ana = patient('Ana', 't1', [visit(1, '2026-09-29', 1)])
  const summary = buildSummary([ana], [timeline('t1')], today)
  assert.deepEqual(labels(summary.dueThisWeek), ['Ana #1'])
  assert.deepEqual(labels(summary.closingSoon), ['Ana #1'])
})

test('due this week is in target order, and closing soon in closing order, whatever the target', () => {
  const ana = patient('Ana', 't1', [visit(1, '2026-09-30', 0)])
  const bob = patient('Bob', 't1', [visit(1, '2026-09-28', 3)])
  const cara = patient('Cara', 't1', [visit(1, '2026-09-29', 0)])
  const summary = buildSummary([ana, bob, cara], [timeline('t1')], today)
  assert.deepEqual(labels(summary.dueThisWeek), ['Bob #1', 'Cara #1', 'Ana #1'])
  assert.deepEqual(labels(summary.closingSoon), ['Cara #1', 'Ana #1', 'Bob #1'])
})

test('overdue puts the most recently closed window first', () => {
  const ana = patient('Ana', 't1', [visit(1, '2026-06-01', 3)])
  const bob = patient('Bob', 't1', [visit(1, '2026-09-20', 3)])
  const summary = buildSummary([ana, bob], [timeline('t1')], today)
  assert.deepEqual(labels(summary.overdue), ['Bob #1', 'Ana #1'])
})

test('deviations come newest first by attended date, not by target, however long ago', () => {
  const ana = patient('Ana', 't1', [visit(1, '2025-11-03', 3, '2025-11-20'), visit(2, '2026-09-07', 3, '2026-09-25')])
  const bob = patient('Bob', 't1', [visit(1, '2026-09-15', 3, '2026-09-10')])
  const summary = buildSummary([ana, bob], [timeline('t1')], today)
  assert.deepEqual(labels(summary.deviations), ['Ana #2', 'Bob #1', 'Ana #1'])
})

test('visits on the same date keep the order of the patients, then of the visits', () => {
  const cara = patient('Cara', 't1', [visit(1, '2026-09-10', 3), visit(2, '2026-09-12', 1), visit(3, '2026-09-29', 0)])
  const ana = patient('Ana', 't1', [visit(1, '2026-09-11', 2), visit(2, '2026-09-29', 0)])
  const bob = patient('Bob', 't1', [visit(1, '2026-09-12', 1), visit(2, '2026-09-29', 0)])
  const summary = buildSummary([cara, ana, bob], [timeline('t1')], today)
  assert.deepEqual(labels(summary.dueThisWeek), ['Cara #3', 'Ana #2', 'Bob #2'])
  assert.deepEqual(labels(summary.overdue), ['Cara #1', 'Cara #2', 'Ana #1', 'Bob #1'])
})

test('visits this month are counted by target, recorded or not, against last month', () => {
  const ana = patient('Ana', 't1', [
    visit(1, '2026-07-31', 3),
    visit(2, '2026-08-01', 3, '2026-08-01'),
    visit(3, '2026-08-31', 3),
    visit(4, '2026-09-01', 3, '2026-09-02'),
    visit(5, '2026-09-30', 3),
    visit(6, '2026-10-01', 3),
  ])
  const summary = buildSummary([ana], [timeline('t1')], today)
  assert.equal(summary.counts.visitsThisMonth, 2)
  assert.equal(summary.counts.visitsLastMonth, 2)
})

test("in January, last month is the December before", () => {
  const ana = patient('Ana', 't1', [visit(1, '2026-12-01', 3), visit(2, '2026-12-31', 3), visit(3, '2027-01-01', 3)])
  const summary = buildSummary([ana], [timeline('t1')], '2027-01-05')
  assert.equal(summary.counts.visitsThisMonth, 1)
  assert.equal(summary.counts.visitsLastMonth, 2)
})

test('on 31 March, last month is February, however short', () => {
  const ana = patient('Ana', 't1', [visit(1, '2026-02-01', 3), visit(2, '2026-02-28', 3), visit(3, '2026-03-01', 3)])
  const summary = buildSummary([ana], [timeline('t1')], '2026-03-31')
  assert.equal(summary.counts.visitsThisMonth, 1)
  assert.equal(summary.counts.visitsLastMonth, 2)
})

test('an active patient has a visit with nothing recorded whose window has not closed', () => {
  const closingToday = patient('Ana', 't1', [visit(1, '2026-09-20', 3, '2026-09-20'), visit(2, '2026-09-25', 3)])
  const allRecorded = patient('Bob', 't1', [visit(1, '2026-09-20', 3, '2026-09-20'), visit(2, '2026-09-30', 3, '2026-09-28')])
  const onlyOverdue = patient('Cara', 't1', [visit(1, '2026-09-20', 3)])
  const upcoming = patient('Dan', 't1', [visit(1, '2026-12-01', 3)])
  const summary = buildSummary([closingToday, allRecorded, onlyOverdue, upcoming], [timeline('t1')], today)
  assert.equal(summary.counts.patients, 4)
  assert.equal(summary.counts.activePatients, 2)
})

test('a timeline is active when at least one active patient is on it', () => {
  const active = patient('Ana', 't1', [visit(1, '2026-10-10', 3)])
  const finished = patient('Bob', 't2', [visit(1, '2026-09-01', 3, '2026-09-01')])
  const summary = buildSummary([active, finished], [timeline('t1'), timeline('t2'), timeline('t3')], today)
  assert.equal(summary.counts.timelines, 3)
  assert.equal(summary.counts.activeTimelines, 1)
})

test('recorded counts every visit with an attended date, in window or not', () => {
  const ana = patient('Ana', 't1', [
    visit(1, '2026-09-01', 3, '2026-09-01'),
    visit(2, '2026-09-08', 3, '2026-09-20'),
    visit(3, '2026-09-15', 3),
  ])
  const summary = buildSummary([ana], [timeline('t1')], today)
  assert.equal(summary.counts.recorded, 2)
  assert.equal(summary.deviations.length, 1)
})

test('a patient whose timeline was deleted is still listed and counted, but adds no active timeline', () => {
  const orphan = patient('Ana', null, [visit(1, '2026-09-28', 0), visit(2, '2026-09-01', 3, '2026-09-20')])
  const summary = buildSummary([orphan], [timeline('t1')], today)
  assert.deepEqual(labels(summary.dueThisWeek), ['Ana #1'])
  assert.deepEqual(labels(summary.closingSoon), ['Ana #1'])
  assert.deepEqual(labels(summary.deviations), ['Ana #2'])
  assert.equal(summary.counts.activePatients, 1)
  assert.equal(summary.counts.activeTimelines, 0)
  assert.equal(summary.counts.visitsThisMonth, 2)
})

test('no patients and no timelines give empty lists and zero counts', () => {
  assert.deepEqual(buildSummary([], [], today), {
    dueThisWeek: [],
    closingSoon: [],
    overdue: [],
    deviations: [],
    counts: {
      patients: 0,
      activePatients: 0,
      timelines: 0,
      activeTimelines: 0,
      visitsThisMonth: 0,
      visitsLastMonth: 0,
      recorded: 0,
    },
  })
})

test('timelines with no patients are counted, but none of them is active', () => {
  const summary = buildSummary([], [timeline('t1'), timeline('t2')], today)
  assert.equal(summary.counts.timelines, 2)
  assert.equal(summary.counts.activeTimelines, 0)
})
