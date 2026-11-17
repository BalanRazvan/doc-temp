import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useStore } from '../lib/store.ts'
import { supabase } from '../lib/supabase.ts'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/timelines', label: 'Timelines' },
  { to: '/patients', label: 'Patients' },
  { to: '/procedure-sets', label: 'Procedure sets' },
  { to: '/studies', label: 'Studies' },
  { to: '/guide', label: 'Guide' },
  { to: '/backup', label: 'Backup' },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white transition-colors'
    : 'rounded-md px-3 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'
}

export default function Layout() {
  const loadTimelines = useStore((state) => state.loadTimelines)
  const loadPatients = useStore((state) => state.loadPatients)
  const loadProcedureSets = useStore((state) => state.loadProcedureSets)
  const loadSavedArticles = useStore((state) => state.loadSavedArticles)
  const clear = useStore((state) => state.clear)
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'))

  useEffect(() => {
    loadTimelines()
    loadPatients()
    loadProcedureSets()
    loadSavedArticles()
    return () => clear()
  }, [loadTimelines, loadPatients, loadProcedureSets, loadSavedArticles, clear])

  function toggleDark() {
    document.documentElement.classList.toggle('dark', !dark)
    try {
      localStorage.setItem('theme', dark ? 'light' : 'dark')
    } catch {}
    setDark(!dark)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 px-4 py-2">
        <span className="font-semibold">Doctor Schedule</span>
        <nav className="flex w-full flex-wrap items-center gap-1 lg:w-auto lg:flex-1">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          <div className="ml-auto flex items-center gap-4">
            <button
              onClick={toggleDark}
              aria-label="Dark mode"
              aria-pressed={dark}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm hover:bg-slate-50"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-600 hover:text-slate-900">
              Sign out
            </button>
          </div>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
