import type { Timeline } from '../lib/types.ts'
import { attendedPillClass, targetPillClass, windowPillClass } from '../lib/ui.ts'

const headingClass = 'mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase'

export default function Legend({ timelines }: { timelines: Timeline[] }) {
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <h2 className="font-semibold text-slate-900">Legend</h2>

      <section>
        <h3 className={headingClass}>Timelines</h3>
        <ul className="space-y-1.5">
          {timelines.map((timeline) => (
            <li key={timeline.id} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full bg-slate-300"
                style={{ backgroundColor: timeline.color ?? undefined }}
              />
              <span className="truncate text-slate-900">{timeline.name}</span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full bg-slate-300" />
            <span>No timeline</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className={headingClass}>On a day</h3>
        <ul className="space-y-2">
          <li className="flex items-center gap-3">
            <span className={`w-24 shrink-0 ${targetPillClass}`}>
              Name · #2
            </span>
            <span>Target day</span>
          </li>
          <li className="flex items-center gap-3">
            <span className={`w-24 shrink-0 ${windowPillClass}`}>
              Name · #2
            </span>
            <span>Window day: coming today is still on time</span>
          </li>
          <li className="flex items-center gap-3">
            <span className={`w-24 shrink-0 ${attendedPillClass}`}>
              ✓ Name · #2
            </span>
            <span>Attended on this day, not on its target day</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className={headingClass}>Status</h3>
        <ul className="space-y-1.5">
          <li className="flex gap-3">
            <span className="w-4 shrink-0 text-center text-slate-900">✓</span>
            <span>Attended inside its window</span>
          </li>
          <li className="flex gap-3">
            <span className="w-4 shrink-0 text-center text-slate-900">⚠</span>
            <span>Deviation: attended outside its window</span>
          </li>
          <li className="flex gap-3">
            <span className="w-4 shrink-0" />
            <span>No mark: nothing recorded yet</span>
          </li>
        </ul>
      </section>
    </div>
  )
}
