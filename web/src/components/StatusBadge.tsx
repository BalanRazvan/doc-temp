import { statusWords } from '../lib/schedule.ts'
import type { VisitStatus } from '../lib/schedule.ts'

type Props = { status: VisitStatus; small?: boolean; booked?: boolean }

export default function StatusBadge({ status, small, booked }: Props) {
  if (status === 'scheduled') return null
  const size = small ? 'h-3.5 w-3.5 text-[9px] ring-2 ring-white' : 'h-4 w-4 text-[10px]'
  const shape = `inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${size}`
  const title = booked ? `${statusWords(status)} · booked` : statusWords(status)
  let colour = booked ? 'border-2 border-green-700 bg-surface text-green-700' : 'bg-green-700 text-[#fff]'
  if (status === 'in-window') {
    // blue-600's hue at green-700's lightness: no Tailwind blue clears 3 : 1 on a dark card.
    colour = booked
      ? 'border-2 border-[oklch(56%_0.245_262.881)] bg-surface text-[oklch(56%_0.245_262.881)]'
      : 'bg-[oklch(56%_0.245_262.881)] text-[#fff]'
  }
  if (status === 'deviation') {
    // red-600's own value: index.css lightens red-600 in dark mode, for error text.
    colour = booked
      ? 'border-2 border-[oklch(57.7%_0.245_27.325)] bg-surface text-[oklch(57.7%_0.245_27.325)]'
      : 'bg-[oklch(57.7%_0.245_27.325)] text-[#fff]'
  }
  return (
    <span role="img" title={title} className={`${shape} ${colour}`}>
      {status === 'deviation' ? '!' : '✓'}
    </span>
  )
}
