import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDays,
  computeVisitDates,
  droppedRecords,
  fixedStepVisits,
  nextColor,
  orderVisits,
  parseISO,
  recordActual,
  resnapshot,
  snapshotVisits,
  toISO,
  visitStatus,
  windowDates,
} from './schedule.ts'
import type { Timeline, TimelineVisit, Visit } from './types.ts'

const protocol: TimelineVisit[] = [
  { visitNumber: 1, week: 0, window: 3, procedures: ['p1'] },
  { visitNumber: 2, week: 4, window: 3, procedures: ['p1', 'p2'] },
  { visitNumber: 3, week: 12, window: 7, procedures: ['p2'] },
]

function makeTimeline(visits: TimelineVisit[]): Timeline {
  return {
    id: 't1',
    user_id: 'u1',
    name: 'Protocol A',
    color: null,
    visits,
    procedures: [],
    created_at: '2026-01-01T00:00:00Z',
  }
}

function visitOn(targetDate: string, window: number, actualDate?: string): Visit {
  const visit: Visit = { visitNumber: 1, week: 0, window, targetDate, procedures: [] }
  if (actualDate) visit.actualDate = actualDate
  return visit
}

test('parseISO lands on the given calendar day at local noon', () => {
  const date = parseISO('2026-10-11')
  assert.equal(date.getFullYear(), 2026)
  assert.equal(date.getMonth(), 9)
  assert.equal(date.getDate(), 11)
  assert.equal(date.getHours(), 12)
})

test('toISO reverses parseISO', () => {
  assert.equal(toISO(parseISO('2026-01-31')), '2026-01-31')
  assert.equal(toISO(parseISO('2026-12-01')), '2026-12-01')
})

test('addDays rolls over the end of a month', () => {
  assert.equal(toISO(addDays(parseISO('2026-01-31'), 1)), '2026-02-01')
  assert.equal(toISO(addDays(parseISO('2026-03-01'), -1)), '2026-02-28')
})

test('every target date is the anchor plus whole weeks', () => {
  const visits = computeVisitDates(protocol, '2026-06-28')
  assert.deepEqual(
    visits.map((visit) => visit.targetDate),
    ['2026-06-28', '2026-07-26', '2026-09-20'],
  )
})

test('a protocol that opens before week zero anchors on its first visit', () => {
  const screeningFirst: TimelineVisit[] = [
    { visitNumber: 1, week: -2, window: 5, procedures: [] },
    { visitNumber: 2, week: 0, window: 3, procedures: [] },
    { visitNumber: 3, week: 4, window: 3, procedures: [] },
  ]
  const visits = computeVisitDates(screeningFirst, '2026-06-28')
  assert.deepEqual(
    visits.map((visit) => visit.targetDate),
    ['2026-06-28', '2026-07-12', '2026-08-09'],
  )
})

test('week math survives the March daylight saving change', () => {
  const visits = computeVisitDates(protocol, '2026-03-15')
  assert.equal(visits[1].targetDate, '2026-04-12')
})

test('week math survives the October daylight saving change', () => {
  const visits = computeVisitDates(protocol, '2026-10-11')
  assert.equal(visits[1].targetDate, '2026-11-08')
})

test('re-anchoring a patient keeps what was already recorded', () => {
  const recorded: Visit[] = [
    {
      visitNumber: 1,
      week: 0,
      window: 3,
      targetDate: '2026-06-28',
      actualDate: '2026-06-29',
      note: 'came early',
      procedures: [],
    },
    { visitNumber: 2, week: 4, window: 3, targetDate: '2026-07-26', procedures: [] },
  ]
  const visits = computeVisitDates(recorded, '2026-07-05')
  assert.equal(visits[0].targetDate, '2026-07-05')
  assert.equal(visits[0].actualDate, '2026-06-29')
  assert.equal(visits[0].note, 'came early')
  assert.equal(visits[1].targetDate, '2026-08-02')
})

test('a protocol with no visits projects nothing', () => {
  assert.deepEqual(computeVisitDates([], '2026-06-28'), [])
})

test('a fresh snapshot has nothing recorded against it', () => {
  const visits = snapshotVisits(makeTimeline(protocol), '2026-06-28')
  assert.equal(visits.length, 3)
  assert.deepEqual(visits.map(visitStatus), ['scheduled', 'scheduled', 'scheduled'])
})

test('editing the timeline afterwards does not move the snapshot', () => {
  const timeline = makeTimeline([{ visitNumber: 1, week: 0, window: 3, procedures: ['p1'] }])
  const visits = snapshotVisits(timeline, '2026-06-28')
  timeline.visits[0].week = 8
  timeline.visits[0].window = 99
  timeline.visits[0].procedures.push('p2')
  assert.equal(visits[0].week, 0)
  assert.equal(visits[0].window, 3)
  assert.deepEqual(visits[0].procedures, ['p1'])
  assert.equal(visits[0].targetDate, '2026-06-28')
})

test('the window reaches the same number of days either side of the target', () => {
  assert.deepEqual(windowDates(visitOn('2026-07-01', 3)), { from: '2026-06-28', to: '2026-07-04' })
})

test('a visit with no window opens and closes on the target day', () => {
  assert.deepEqual(windowDates(visitOn('2026-07-01', 0)), { from: '2026-07-01', to: '2026-07-01' })
})

test('a visit with nothing recorded is scheduled', () => {
  assert.equal(visitStatus(visitOn('2026-07-01', 3)), 'scheduled')
})

test('attendance on either edge of the window is still on time', () => {
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-06-28')), 'in-window')
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-07-01')), 'in-window')
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-07-04')), 'in-window')
})

test('attendance one day outside either edge is a deviation', () => {
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-06-27')), 'deviation')
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-07-05')), 'deviation')
})

test('recording attendance returns a new visit and leaves the original alone', () => {
  const visit = visitOn('2026-07-01', 3)
  const updated = recordActual(visit, '2026-07-05')
  assert.equal(updated.actualDate, '2026-07-05')
  assert.equal(updated.targetDate, visit.targetDate)
  assert.equal('actualDate' in visit, false)
})

test('clearing attendance removes the date instead of blanking it', () => {
  const recorded = recordActual(visitOn('2026-07-01', 3), '2026-07-05')
  assert.equal('actualDate' in recordActual(recorded, null), false)
})

test('resnapshot takes the new timeline dates and keeps recorded attendance', () => {
  const snapshot = snapshotVisits(makeTimeline(protocol), '2026-06-28')
  const attended = { ...recordActual(snapshot[0], '2026-06-29'), note: 'came early' }
  const patient = [attended, snapshot[1], snapshot[2]]
  const edited = makeTimeline([
    { visitNumber: 1, week: 0, window: 3, procedures: ['p1'] },
    { visitNumber: 2, week: 6, window: 3, procedures: ['p1'] },
  ])
  const visits = resnapshot(patient, edited, '2026-06-28')
  assert.equal(visits[1].targetDate, '2026-08-09')
  assert.equal(visits[0].actualDate, '2026-06-29')
  assert.equal(visits[0].note, 'came early')
})

test('resnapshot drops a visit the new timeline no longer has', () => {
  const patient = snapshotVisits(makeTimeline(protocol), '2026-06-28')
  const edited = makeTimeline([{ visitNumber: 1, week: 0, window: 3, procedures: ['p1'] }])
  const visits = resnapshot(patient, edited, '2026-06-28')
  assert.deepEqual(
    visits.map((visit) => visit.visitNumber),
    [1],
  )
})

test('a visit the new timeline adds starts with nothing recorded', () => {
  const patient = recordActual(snapshotVisits(makeTimeline(protocol), '2026-06-28')[0], '2026-06-29')
  const edited = makeTimeline([
    { visitNumber: 1, week: 0, window: 3, procedures: ['p1'] },
    { visitNumber: 9, week: 20, window: 7, procedures: [] },
  ])
  const visits = resnapshot([patient], edited, '2026-06-28')
  assert.equal(visitStatus(visits[1]), 'scheduled')
  assert.equal(visits[1].targetDate, '2026-11-15')
})

test('a switch lists the recorded visits the new timeline does not have', () => {
  const snapshot = snapshotVisits(makeTimeline(protocol), '2026-06-28')
  const patient = [
    recordActual(snapshot[0], '2026-06-29'),
    recordActual(snapshot[1], '2026-07-27'),
    snapshot[2],
  ]
  const shorter = makeTimeline([{ visitNumber: 1, week: 0, window: 3, procedures: [] }])
  assert.deepEqual(
    droppedRecords(patient, shorter).map((visit) => visit.visitNumber),
    [2],
  )
})

test('a note on its own counts as something a switch would drop', () => {
  const snapshot = snapshotVisits(makeTimeline(protocol), '2026-06-28')
  const patient = [snapshot[0], { ...snapshot[1], note: 'phoned to cancel' }, snapshot[2]]
  const shorter = makeTimeline([{ visitNumber: 1, week: 0, window: 3, procedures: [] }])
  assert.deepEqual(
    droppedRecords(patient, shorter).map((visit) => visit.visitNumber),
    [2],
  )
})

test('each new timeline gets the next golden-angle hue', () => {
  const first = nextColor([])
  const second = nextColor([first])
  const third = nextColor([first, second])
  assert.deepEqual([first, second, third], ['hsl(0 70% 50%)', 'hsl(137.5 70% 50%)', 'hsl(275 70% 50%)'])
})

test('after a timeline is deleted the next one takes its free hue, not a hue still in use', () => {
  assert.equal(nextColor(['hsl(0 70% 50%)', 'hsl(275 70% 50%)']), 'hsl(137.5 70% 50%)')
})

test('visits typed out of order are put in week order and numbered from 1', () => {
  const typed: TimelineVisit[] = [
    { visitNumber: 1, week: 4, window: 3, procedures: [] },
    { visitNumber: 2, week: -2, window: 5, procedures: [] },
    { visitNumber: 3, week: 0, window: 3, procedures: [] },
  ]
  const ordered = orderVisits(typed)
  assert.deepEqual(
    ordered.map((visit) => [visit.visitNumber, visit.week]),
    [[1, -2], [2, 0], [3, 4]],
  )
  assert.equal(typed[0].week, 4)
  assert.equal(computeVisitDates(ordered, '2026-06-28')[0].targetDate, '2026-06-28')
})

test('a fixed step makes evenly spaced visits from week 0', () => {
  const visits = fixedStepVisits(4, 3, 2)
  assert.deepEqual(
    visits.map((visit) => [visit.visitNumber, visit.week, visit.window]),
    [[1, 0, 2], [2, 3, 2], [3, 6, 2], [4, 9, 2]],
  )
  assert.deepEqual(visits[0].procedures, [])
})
