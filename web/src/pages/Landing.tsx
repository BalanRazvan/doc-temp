import { Link } from 'react-router'
import { buttonClass } from '../lib/ui.ts'

export default function Landing() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Doctor Schedule</h1>
      <Link to="/signin" className={`mt-8 inline-block ${buttonClass}`}>
        Sign in
      </Link>
    </main>
  )
}
