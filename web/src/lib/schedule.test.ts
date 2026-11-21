import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDays,
  addMonths,
  addProcedure,
  appendNames,
  attendedOn,
  changedStatuses,
  computeVisitDates,
  daysBetween,
  droppedRecords,
  dropRemovedTicks,
  fixedStepVisits,
  isBooked,
  monthGrid,
  namesFromLines,
  nextColor,
  orderVisits,
  parseISO,
  plannedProcedures,
  recordActual,
  removeProcedure,
  renameProcedure,
  repeatedName,
  resnapshot,
  snapshotVisits,
  startOfMonth,
  statusWords,
  toggleTick,
  toISO,
  visitsOn,
  visitStatus,
  weekdayName,
  weekendOnly,
  windowsOn,
  windowDates,
  windowWords,
} from './schedule.ts'
import type { Patient, Timeline, TimelineVisit, Visit } from './types.ts'

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

function enrolled(name: string, visits: Visit[]): Patient {
  return {
    id: name,
    user_id: 'u1',
    name,
    anchor_date: visits[0].targetDate,
    source_timeline_id: 't1',
    visits,
    procedures: [],
    note: null,
    created_at: '2026-01-01T00:00:00Z',
  }
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

test('a visit with only a note is still scheduled', () => {
  assert.equal(visitStatus({ ...visitOn('2026-07-01', 3), note: 'called, no answer' }), 'scheduled')
})

test('attendance on either edge of the window is still in window', () => {
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-06-28')), 'in-window')
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-07-04')), 'in-window')
})

test('attendance on the target day is on target, not just in window', () => {
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-07-01')), 'on-target')
})

test('a visit with no window attended on its target is on target', () => {
  assert.equal(visitStatus(visitOn('2026-07-01', 0, '2026-07-01')), 'on-target')
})

test('one day either side of the target, inside the window, is in window', () => {
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-06-30')), 'in-window')
  assert.equal(visitStatus(visitOn('2026-07-01', 3, '2026-07-02')), 'in-window')
})

test('a visit with nothing recorded, or only a note, is not booked', () => {
  assert.equal(isBooked(visitOn('2026-11-25', 3), '2026-11-21'), false)
  assert.equal(isBooked({ ...visitOn('2026-11-25', 3), note: 'will call back' }, '2026-11-21'), false)
})

test('a day already past, or today itself, is not booked; tomorrow is', () => {
  assert.equal(isBooked(visitOn('2026-11-22', 3, '2026-11-20'), '2026-11-21'), false)
  assert.equal(isBooked(visitOn('2026-11-22', 3, '2026-11-21'), '2026-11-21'), false)
  assert.equal(isBooked(visitOn('2026-11-22', 3, '2026-11-22'), '2026-11-21'), true)
})

test('booked is about the day recorded, not the target', () => {
  assert.equal(isBooked(visitOn('2026-11-30', 7, '2026-11-24'), '2026-11-25'), false)
  assert.equal(isBooked(visitOn('2026-11-18', 7, '2026-11-24'), '2026-11-21'), true)
})

test('a day booked across the new year is still to come', () => {
  assert.equal(isBooked(visitOn('2027-01-01', 3, '2027-01-01'), '2026-12-31'), true)
})

test('each status has its own words', () => {
  assert.equal(statusWords('scheduled'), 'Nothing recorded yet')
  assert.equal(statusWords('on-target'), 'On the target day')
  assert.equal(statusWords('in-window'), 'In window, not on the target day')
  assert.equal(statusWords('deviation'), 'Deviation: outside the window')
})

test('days between two dates count forward, are zero for the same day, and negative backwards', () => {
  assert.equal(daysBetween('2026-07-01', '2026-07-01'), 0)
  assert.equal(daysBetween('2026-07-01', '2026-07-31'), 30)
  assert.equal(daysBetween('2026-07-31', '2026-07-01'), -30)
})

test('days between still counts whole days across the March daylight saving change', () => {
  assert.equal(daysBetween('2026-03-28', '2026-03-29'), 1)
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2)
})

test('days between still counts whole days across the October daylight saving change', () => {
  assert.equal(daysBetween('2026-10-24', '2026-10-25'), 1)
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2)
})

test('before its window, an unrecorded visit says when the window opens', () => {
  const visit = visitOn('2026-07-10', 3)
  assert.equal(windowWords(visit, '2026-07-06'), 'opens tomorrow')
  assert.equal(windowWords(visit, '2026-07-01'), 'opens in 6 days')
})

test('inside its window, an unrecorded visit says when the window closes, both edges included', () => {
  const visit = visitOn('2026-07-10', 3)
  assert.equal(windowWords(visit, '2026-07-07'), 'closes in 6 days')
  assert.equal(windowWords(visit, '2026-07-11'), 'closes in 2 days')
  assert.equal(windowWords(visit, '2026-07-12'), 'closes tomorrow')
  assert.equal(windowWords(visit, '2026-07-13'), 'closes today')
})

test('after its window, an unrecorded visit says how long ago it closed', () => {
  const visit = visitOn('2026-07-10', 3)
  assert.equal(windowWords(visit, '2026-07-14'), 'closed yesterday')
  assert.equal(windowWords(visit, '2026-07-20'), 'closed 7 days ago')
})

test('a visit with no window opens tomorrow, closes today and closed yesterday around its target', () => {
  const visit = visitOn('2026-07-10', 0)
  assert.equal(windowWords(visit, '2026-07-09'), 'opens tomorrow')
  assert.equal(windowWords(visit, '2026-07-10'), 'closes today')
  assert.equal(windowWords(visit, '2026-07-11'), 'closed yesterday')
})

test('a visit with only a note is spoken of as unrecorded', () => {
  assert.equal(windowWords({ ...visitOn('2026-07-10', 3), note: 'called' }, '2026-07-12'), 'closes tomorrow')
})

test('a deviation is counted from the edge of the window it missed, not from the target', () => {
  assert.equal(windowWords(visitOn('2026-07-10', 3, '2026-07-06'), '2026-08-01'), '1 day before the window')
  assert.equal(windowWords(visitOn('2026-07-10', 3, '2026-07-03'), '2026-08-01'), '4 days before the window')
  assert.equal(windowWords(visitOn('2026-07-10', 3, '2026-07-14'), '2026-08-01'), '1 day after the window')
  assert.equal(windowWords(visitOn('2026-07-10', 3, '2026-07-17'), '2026-08-01'), '4 days after the window')
})

test("a deviation's words do not change with today", () => {
  const visit = visitOn('2026-07-10', 3, '2026-07-17')
  assert.equal(windowWords(visit, '2026-07-17'), windowWords(visit, '2027-01-01'))
})

test('attendance on the target or elsewhere in the window has no window words', () => {
  assert.equal(windowWords(visitOn('2026-07-10', 3, '2026-07-10'), '2026-07-20'), '')
  assert.equal(windowWords(visitOn('2026-07-10', 3, '2026-07-07'), '2026-07-20'), '')
  assert.equal(windowWords(visitOn('2026-07-10', 3, '2026-07-13'), '2026-07-20'), '')
})

test('window words count whole days across the October daylight saving change', () => {
  const visit = visitOn('2026-10-22', 3)
  assert.equal(windowWords(visit, '2026-10-24'), 'closes tomorrow')
  assert.equal(windowWords(visit, '2026-10-26'), 'closed yesterday')
  assert.equal(windowWords(visitOn('2026-10-22', 3, '2026-10-26'), '2026-11-01'), '1 day after the window')
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
  const visits = fixedStepVisits(4, 3, 2, {})
  assert.deepEqual(
    visits.map((visit) => [visit.visitNumber, visit.week, visit.window]),
    [[1, 0, 2], [2, 3, 2], [3, 6, 2], [4, 9, 2]],
  )
  assert.deepEqual(visits[0].procedures, [])
})

test('a new procedure goes at the end of the list, blank, with the id it is given', () => {
  const procedures = [{ id: 'p1', name: 'Vitals' }]
  assert.deepEqual(addProcedure(procedures, 'p2'), [
    { id: 'p1', name: 'Vitals' },
    { id: 'p2', name: '' },
  ])
  assert.equal(procedures.length, 1)
})

test('renaming a procedure keeps its id and its place, even beside another with the same name', () => {
  const procedures = [
    { id: 'p1', name: '' },
    { id: 'p2', name: '' },
    { id: 'p3', name: 'ECG' },
  ]
  assert.deepEqual(renameProcedure(procedures, 'p2', 'Bloods'), [
    { id: 'p1', name: '' },
    { id: 'p2', name: 'Bloods' },
    { id: 'p3', name: 'ECG' },
  ])
  assert.equal(procedures[1].name, '')
})

test('removing a procedure removes that one only, even when another has the same name', () => {
  const procedures = [
    { id: 'p1', name: 'Bloods' },
    { id: 'p2', name: 'Vitals' },
    { id: 'p3', name: 'Bloods' },
  ]
  assert.deepEqual(removeProcedure(procedures, 'p3'), [
    { id: 'p1', name: 'Bloods' },
    { id: 'p2', name: 'Vitals' },
  ])
  assert.equal(procedures.length, 3)
})

test('ticking a cell adds the procedure to the visit, and ticking it again takes it off', () => {
  const ticks = ['p1']
  const ticked = toggleTick(ticks, 'p2')
  assert.deepEqual(ticked, ['p1', 'p2'])
  assert.deepEqual(toggleTick(ticked, 'p1'), ['p2'])
  assert.deepEqual(ticks, ['p1'])
})

test('a visit whose week puts it earlier keeps its own ticks when the visits are put in order', () => {
  const typed: TimelineVisit[] = [
    { visitNumber: 1, week: 0, window: 3, procedures: ['p1'] },
    { visitNumber: 2, week: 4, window: 3, procedures: [] },
    { visitNumber: 3, week: -2, window: 5, procedures: ['p2', 'p3'] },
  ]
  assert.deepEqual(
    orderVisits(typed).map((visit) => [visit.visitNumber, visit.week, visit.procedures]),
    [[1, -2, ['p2', 'p3']], [2, 0, ['p1']], [3, 4, []]],
  )
})

test('removing a visit leaves every other visit with its own ticks, not its neighbour\'s', () => {
  const typed: TimelineVisit[] = [
    { visitNumber: 1, week: 0, window: 3, procedures: ['p1'] },
    { visitNumber: 2, week: 4, window: 3, procedures: ['p2'] },
    { visitNumber: 3, week: 8, window: 3, procedures: ['p3'] },
  ]
  const kept = orderVisits(typed.filter((visit) => visit.week !== 4))
  assert.deepEqual(
    kept.map((visit) => [visit.visitNumber, visit.week, visit.procedures]),
    [[1, 0, ['p1']], [2, 8, ['p3']]],
  )
})

test("changing a fixed step's spacing or window keeps each visit's ticks", () => {
  const ticks = { 1: ['p1', 'p2'], 3: ['p2'] }
  const before = fixedStepVisits(3, 4, 3, ticks)
  const after = fixedStepVisits(3, 8, 5, ticks)
  assert.deepEqual(
    after.map((visit) => [visit.week, visit.procedures]),
    [[0, ['p1', 'p2']], [8, []], [16, ['p2']]],
  )
  assert.deepEqual(
    after.map((visit) => visit.procedures),
    before.map((visit) => visit.procedures),
  )
})

test('a lower fixed count leaves the later ticks out, and raising it again brings them back', () => {
  const ticks = { 1: ['p1'], 4: ['p2'] }
  assert.deepEqual(
    fixedStepVisits(1, 4, 3, ticks).map((visit) => visit.procedures),
    [['p1']],
  )
  assert.deepEqual(
    fixedStepVisits(5, 4, 3, ticks).map((visit) => visit.procedures),
    [['p1'], [], [], ['p2'], []],
  )
})

test("a removed procedure's ticks are dropped from every visit, and the other ticks stay", () => {
  const visits: TimelineVisit[] = [
    { visitNumber: 1, week: 0, window: 3, procedures: ['p1', 'gone'] },
    { visitNumber: 2, week: 4, window: 3, procedures: ['gone'] },
    { visitNumber: 3, week: 8, window: 3, procedures: ['p2'] },
  ]
  const procedures = [
    { id: 'p1', name: 'Vitals' },
    { id: 'p2', name: 'Bloods' },
  ]
  assert.deepEqual(
    dropRemovedTicks(visits, procedures).map((visit) => visit.procedures),
    [['p1'], [], ['p2']],
  )
  assert.deepEqual(visits[0].procedures, ['p1', 'gone'])
})

test('the month on screen is kept as its 1st day', () => {
  assert.equal(startOfMonth('2026-09-27'), '2026-09-01')
})

test('the month after 31 January is February, not March', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-01')
})

test('stepping a month crosses the new year both ways', () => {
  assert.equal(addMonths('2026-12-01', 1), '2027-01-01')
  assert.equal(addMonths('2027-01-01', -1), '2026-12-01')
})

test('the grid opens on the Monday before the 1st', () => {
  const days = monthGrid('2026-09-01')
  assert.equal(days[0], '2026-08-31')
  assert.equal(days[1], '2026-09-01')
})

test('a month that starts on a Sunday has six days of the month before', () => {
  const days = monthGrid('2026-02-01')
  assert.equal(days[0], '2026-01-26')
  assert.equal(days[6], '2026-02-01')
})

test('a month that starts on a Monday opens on its 1st', () => {
  assert.equal(monthGrid('2027-02-01')[0], '2027-02-01')
})

test('a four-week February and a six-week August are both drawn as six weeks', () => {
  const february = monthGrid('2027-02-01')
  const august = monthGrid('2026-08-01')
  assert.equal(february.length, 42)
  assert.equal(february[41], '2027-03-14')
  assert.equal(august.length, 42)
  assert.equal(august[41], '2026-09-06')
})

test('grid days run on without a gap or a repeat across the March daylight saving change', () => {
  assert.deepEqual(monthGrid('2026-03-01').slice(33, 36), ['2026-03-28', '2026-03-29', '2026-03-30'])
})

test('grid days run on without a gap or a repeat across the October daylight saving change', () => {
  assert.deepEqual(monthGrid('2026-10-01').slice(26, 29), ['2026-10-24', '2026-10-25', '2026-10-26'])
})

test('a day lists every visit targeted on it, in the order the patients come', () => {
  const zoe = enrolled('Zoe', [visitOn('2026-10-01', 3), { ...visitOn('2026-10-14', 3), visitNumber: 2 }])
  const adam = enrolled('Adam', [visitOn('2026-10-14', 3)])
  assert.deepEqual(
    visitsOn([zoe, adam], '2026-10-14').map((found) => [found.patient.name, found.visit.visitNumber]),
    [['Zoe', 2], ['Adam', 1]],
  )
  assert.deepEqual(visitsOn([zoe, adam], '2026-10-15'), [])
})

test('a visit sits on its target day, not on the day it was attended', () => {
  const patient = enrolled('Zoe', [visitOn('2026-10-14', 3, '2026-10-16')])
  assert.equal(visitsOn([patient], '2026-10-14').length, 1)
  assert.equal(visitsOn([patient], '2026-10-16').length, 0)
})

test('a window day lists the visit whose days either side of the target cover it, edges included', () => {
  const patient = enrolled('Zoe', [visitOn('2026-10-14', 3)])
  assert.equal(windowsOn([patient], '2026-10-11').length, 1)
  assert.equal(windowsOn([patient], '2026-10-17').length, 1)
  assert.equal(windowsOn([patient], '2026-10-10').length, 0)
  assert.equal(windowsOn([patient], '2026-10-18').length, 0)
})

test('the target day itself is not a window day', () => {
  const patient = enrolled('Zoe', [visitOn('2026-10-14', 3)])
  assert.deepEqual(windowsOn([patient], '2026-10-14'), [])
})

test('a visit with no window has no window days', () => {
  const patient = enrolled('Zoe', [visitOn('2026-10-14', 0)])
  assert.deepEqual(windowsOn([patient], '2026-10-13'), [])
  assert.deepEqual(windowsOn([patient], '2026-10-15'), [])
})

test('two overlapping windows of one patient both show, and neither shows on their target days', () => {
  const zoe = enrolled('Zoe', [visitOn('2026-10-07', 7), { ...visitOn('2026-10-14', 7), visitNumber: 2 }])
  assert.deepEqual(
    windowsOn([zoe], '2026-10-10').map((found) => found.visit.visitNumber),
    [1, 2],
  )
  assert.deepEqual(windowsOn([zoe], '2026-10-14'), [])
})

test("another patient's target day still shows this patient's window", () => {
  const zoe = enrolled('Zoe', [visitOn('2026-10-14', 3)])
  const adam = enrolled('Adam', [visitOn('2026-10-12', 3)])
  assert.deepEqual(
    windowsOn([zoe, adam], '2026-10-14').map((found) => found.patient.name),
    ['Adam'],
  )
})

test('a window runs on across the October daylight saving change', () => {
  const patient = enrolled('Zoe', [visitOn('2026-10-24', 3)])
  assert.equal(windowsOn([patient], '2026-10-27').length, 1)
  assert.equal(windowsOn([patient], '2026-10-28').length, 0)
})

test("once a visit is attended its window days go, and the next visit's window stays", () => {
  const zoe = enrolled('Zoe', [
    visitOn('2026-10-07', 7, '2026-10-09'),
    { ...visitOn('2026-10-14', 7), visitNumber: 2 },
  ])
  assert.deepEqual(
    windowsOn([zoe], '2026-10-10').map((found) => found.visit.visitNumber),
    [2],
  )
  assert.deepEqual(windowsOn([zoe], '2026-10-05'), [])
})

test('a deviation has no window days either', () => {
  const patient = enrolled('Zoe', [visitOn('2026-10-14', 3, '2026-10-20')])
  assert.deepEqual(windowsOn([patient], '2026-10-12'), [])
  assert.deepEqual(windowsOn([patient], '2026-10-16'), [])
})

test('a day booked ahead has no window days, on any day of its window', () => {
  const patient = enrolled('Zoe', [visitOn('2026-12-02', 3, '2026-12-03')])
  for (const day of ['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-03', '2026-12-04', '2026-12-05']) {
    assert.deepEqual(windowsOn([patient], day), [], day)
  }
})

test('a visit attended on another day is listed on that day, and only there', () => {
  const patient = enrolled('Zoe', [visitOn('2026-10-14', 3, '2026-10-16')])
  assert.equal(attendedOn([patient], '2026-10-16').length, 1)
  assert.deepEqual(attendedOn([patient], '2026-10-14'), [])
  assert.deepEqual(attendedOn([patient], '2026-10-15'), [])
})

test('a visit booked ahead on another day than its target is listed on its booked day', () => {
  const patient = enrolled('Zoe', [visitOn('2026-12-02', 3, '2026-12-04')])
  const found = attendedOn([patient], '2026-12-04')
  assert.equal(found.length, 1)
  assert.equal(isBooked(found[0].visit, '2026-11-21'), true)
  assert.deepEqual(attendedOn([patient], '2026-12-02'), [])
})

test('a visit attended on its target day is not listed again', () => {
  const patient = enrolled('Zoe', [visitOn('2026-10-14', 3, '2026-10-14')])
  assert.deepEqual(attendedOn([patient], '2026-10-14'), [])
  assert.equal(visitsOn([patient], '2026-10-14').length, 1)
})

test('a deviation is listed on the day it was attended, outside its window', () => {
  const patient = enrolled('Zoe', [visitOn('2026-10-14', 3, '2026-10-20')])
  const found = attendedOn([patient], '2026-10-20')
  assert.equal(found.length, 1)
  assert.equal(visitStatus(found[0].visit), 'deviation')
})

test('a day lists every visit attended on it, in the order the patients come', () => {
  const zoe = enrolled('Zoe', [
    visitOn('2026-10-01', 3, '2026-10-02'),
    { ...visitOn('2026-10-15', 3, '2026-10-14'), visitNumber: 2 },
  ])
  const adam = enrolled('Adam', [visitOn('2026-10-12', 3, '2026-10-14')])
  assert.deepEqual(
    attendedOn([zoe, adam], '2026-10-14').map((found) => [found.patient.name, found.visit.visitNumber]),
    [['Zoe', 2], ['Adam', 1]],
  )
  assert.deepEqual(attendedOn([zoe, adam], '2026-10-01'), [])
})

const soaRows = [
  { id: 'p1', name: 'Vitals' },
  { id: 'p2', name: 'Bloods' },
  { id: 'p3', name: 'ECG' },
]

test("a visit's procedures come in the order of the patient's list, not the order of the visit's ids", () => {
  const visit = { ...visitOn('2026-10-14', 3), procedures: ['p3', 'p1'] }
  const patient = { ...enrolled('Zoe', [visit]), procedures: soaRows }
  assert.deepEqual(
    plannedProcedures(patient, visit).map((procedure) => procedure.name),
    ['Vitals', 'ECG'],
  )
})

test('a visit with no procedures lists none', () => {
  const visit = visitOn('2026-10-14', 3)
  const patient = { ...enrolled('Zoe', [visit]), procedures: soaRows }
  assert.deepEqual(plannedProcedures(patient, visit), [])
})

test("an id the patient's list does not have is left out, and the others still show", () => {
  const visit = { ...visitOn('2026-10-14', 3), procedures: ['p2', 'gone'] }
  const patient = { ...enrolled('Zoe', [visit]), procedures: soaRows }
  assert.deepEqual(plannedProcedures(patient, visit), [{ id: 'p2', name: 'Bloods' }])
})

test('a patient snapshotted from a ticked timeline plans each visit\'s procedures in row order', () => {
  const timeline = {
    ...makeTimeline(fixedStepVisits(3, 4, 3, { 1: ['p3', 'p1'], 3: ['p2'] })),
    procedures: soaRows,
  }
  const visits = snapshotVisits(timeline, '2026-06-28')
  const patient = { ...enrolled('Zoe', visits), procedures: timeline.procedures }
  assert.deepEqual(
    patient.visits.map((visit) => plannedProcedures(patient, visit).map((procedure) => procedure.name)),
    [['Vitals', 'ECG'], [], ['Bloods']],
  )
})

test("editing a timeline's procedures afterwards does not change a patient already on it", () => {
  const timeline = {
    ...makeTimeline(fixedStepVisits(2, 4, 3, { 1: ['p1', 'p2'], 2: ['p2'] })),
    procedures: soaRows,
  }
  const patient = {
    ...enrolled('Zoe', snapshotVisits(timeline, '2026-06-28')),
    procedures: timeline.procedures,
  }
  const before = structuredClone(patient)

  const procedures = removeProcedure(renameProcedure(timeline.procedures, 'p1', 'Vital signs'), 'p2')
  const ticked = timeline.visits.map((visit) => ({ ...visit, procedures: toggleTick(visit.procedures, 'p3') }))
  timeline.procedures = procedures
  timeline.visits = dropRemovedTicks(ticked, procedures)

  assert.deepEqual(patient, before)
  assert.deepEqual(
    patient.visits.map((visit) => plannedProcedures(patient, visit).map((procedure) => procedure.name)),
    [['Vitals', 'Bloods'], ['Bloods']],
  )
  assert.deepEqual(
    timeline.visits.map((visit) => visit.procedures),
    [['p1', 'p3'], ['p3']],
  )
})

function countingIds(): () => string {
  let made = 0
  return () => {
    made++
    return `n${made}`
  }
}

test('a set typed one name per line keeps its names in order, trimmed, and ignores blank lines', () => {
  assert.deepEqual(namesFromLines('  Vitals \n\nBloods\r\n   \nECG\n'), ['Vitals', 'Bloods', 'ECG'])
  assert.deepEqual(namesFromLines(''), [])
})

test('a name typed on two lines is kept twice, so the Save check can name it', () => {
  assert.deepEqual(namesFromLines('Bloods\nbloods'), ['Bloods', 'bloods'])
})

test('a name listed twice is found ignoring case and outer spaces, and given back as the second one, trimmed', () => {
  assert.equal(repeatedName(['Bloods', 'Vitals', ' bloods ']), 'bloods')
})

test('names that differ, even only by an inner space, are not repeats', () => {
  assert.equal(repeatedName(['Blood count', 'Blood  count', 'Bloods', 'ECG']), '')
  assert.equal(repeatedName([]), '')
})

test("applying a set appends its names at the end, in the set's order, each with a new id", () => {
  const procedures = [{ id: 'p1', name: 'Vitals' }]
  const before = structuredClone(procedures)
  assert.deepEqual(appendNames(procedures, ['Bloods', 'ECG'], countingIds()), [
    { id: 'p1', name: 'Vitals' },
    { id: 'n1', name: 'Bloods' },
    { id: 'n2', name: 'ECG' },
  ])
  assert.deepEqual(procedures, before)
})

test('a name already in the list is skipped, ignoring case and outer spaces, and keeps its own id', () => {
  const procedures = [{ id: 'p1', name: ' bloods ' }]
  assert.deepEqual(appendNames(procedures, ['Vitals', 'Bloods', 'ECG'], countingIds()), [
    { id: 'p1', name: ' bloods ' },
    { id: 'n1', name: 'Vitals' },
    { id: 'n2', name: 'ECG' },
  ])
})

test('applying the same set twice adds nothing the second time', () => {
  const newId = countingIds()
  const once = appendNames([], ['Vitals', 'Bloods'], newId)
  assert.deepEqual(appendNames(once, ['Vitals', 'Bloods'], newId), once)
})

test('procedures already ticked keep their ids and ticks when a set is applied', () => {
  const visits = fixedStepVisits(3, 4, 3, { 1: ['p1', 'p2'], 2: ['p2'] })
  const procedures = appendNames(soaRows, ['Bloods', 'Weight', 'Urine'], countingIds())
  assert.deepEqual(
    procedures.map((procedure) => procedure.id),
    ['p1', 'p2', 'p3', 'n1', 'n2'],
  )
  assert.deepEqual(
    dropRemovedTicks(visits, procedures).map((visit) => visit.procedures),
    [['p1', 'p2'], ['p2'], []],
  )
})

test('the weekday is named in full, across the turn of the year', () => {
  assert.equal(weekdayName('2026-12-31'), 'Thursday')
  assert.equal(weekdayName('2027-01-01'), 'Friday')
})

test('a visit with no window on a Saturday or a Sunday can only be attended at the weekend', () => {
  assert.equal(weekendOnly(visitOn('2026-11-21', 0)), true)
  assert.equal(weekendOnly(visitOn('2026-11-22', 0)), true)
})

test('a visit with no window on a Monday is not weekend-only', () => {
  assert.equal(weekendOnly(visitOn('2026-11-23', 0)), false)
})

test('a one-day window around a Saturday reaches the Friday, and around a Sunday the Monday', () => {
  assert.equal(weekendOnly(visitOn('2026-11-21', 1)), false)
  assert.equal(weekendOnly(visitOn('2026-11-22', 1)), false)
})

test('a visit with no window on the Sunday of the October daylight saving change is weekend-only', () => {
  assert.equal(weekendOnly(visitOn('2026-10-25', 0)), true)
})

test('a one-day window around the Sunday of the October daylight saving change still reaches the Monday', () => {
  assert.equal(weekendOnly(visitOn('2026-10-25', 1)), false)
})

test('moving a visit attended on its target by a day turns it from on target to in window', () => {
  const before = [visitOn('2026-07-10', 3, '2026-07-10')]
  const after = computeVisitDates(before, '2026-07-11')
  assert.deepEqual(changedStatuses(before, after), [{ visit: after[0], from: 'on-target', to: 'in-window' }])
})

test('a move can push a visit attended in its window out of it', () => {
  const before = [visitOn('2026-07-10', 3, '2026-07-12')]
  const after = computeVisitDates(before, '2026-07-06')
  assert.deepEqual(changedStatuses(before, after), [{ visit: after[0], from: 'in-window', to: 'deviation' }])
})

test('a visit with no window turns from on target to deviation, and back when moved onto the day attended', () => {
  const onTarget = [visitOn('2026-07-10', 0, '2026-07-10')]
  assert.deepEqual(
    changedStatuses(onTarget, computeVisitDates(onTarget, '2026-07-11')).map((change) => [change.from, change.to]),
    [['on-target', 'deviation']],
  )
  const late = [visitOn('2026-07-10', 0, '2026-07-12')]
  assert.deepEqual(
    changedStatuses(late, computeVisitDates(late, '2026-07-12')).map((change) => [change.from, change.to]),
    [['deviation', 'on-target']],
  )
})

test('a status that stays the same, and a visit with nothing recorded, are not listed', () => {
  const before = [
    visitOn('2026-07-10', 3, '2026-07-12'),
    { ...visitOn('2026-07-24', 3), visitNumber: 2, week: 2 },
    { ...visitOn('2026-08-07', 0), visitNumber: 3, week: 4, note: 'called, no answer' },
  ]
  assert.deepEqual(changedStatuses(before, computeVisitDates(before, '2026-07-11')), [])
})

test('status changes are matched by visit number, not by place in the list', () => {
  const before = [
    visitOn('2026-07-10', 0, '2026-07-10'),
    { ...visitOn('2026-07-24', 0, '2026-07-25'), visitNumber: 2, week: 2 },
  ]
  const after = computeVisitDates(before, '2026-07-11').toReversed()
  assert.deepEqual(
    changedStatuses(before, after).map((change) => [change.visit.visitNumber, change.from, change.to]),
    [
      [2, 'deviation', 'on-target'],
      [1, 'on-target', 'deviation'],
    ],
  )
})
