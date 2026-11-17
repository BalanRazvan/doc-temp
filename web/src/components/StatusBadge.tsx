import type { VisitStatus } from '../lib/schedule.ts'

export default function StatusBadge({ status, small }: { status: VisitStatus; small?: boolean }) {
  if (status === 'scheduled') return null
  const size = small ? 'h-3.5 w-3.5 text-[9px] ring-2 ring-white' : 'h-4 w-4 text-[10px]'
  const shape = `inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none text-[#fff] ${size}`
  if (status === 'in-window') {
    return (
      <span role="img" title="In window" className={`${shape} bg-green-700`}>
        ✓
      </span>
    )
  }
  // red-600's own value: index.css lightens red-600 in dark mode, for error text.
  return (
    <span role="img" title="Deviation: outside the window" className={`${shape} bg-[oklch(57.7%_0.245_27.325)]`}>
      !
    </span>
  )
}
