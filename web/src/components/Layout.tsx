import { useEffect } from 'react'
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
]

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white'
    : 'rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:text-slate-900'
}

export default function Layout() {
  const loadTimelines = useStore((state) => state.loadTimelines)
  const loadPatients = useStore((state) => state.loadPatients)
  const loadProcedureSets = useStore((state) => state.loadProcedureSets)
  const loadSavedArticles = useStore((state) => state.loadSavedArticles)
  const clear = useStore((state) => state.clear)

  useEffect(() => {
    loadTimelines()
    loadPatients()
    loadProcedureSets()
    loadSavedArticles()
    return () => clear()
  }, [loadTimelines, loadPatients, loadProcedureSets, loadSavedArticles, clear])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 px-4 py-2">
        <span className="font-semibold">Doctor Schedule</span>
        <nav className="flex flex-wrap gap-1">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="ml-auto text-sm text-slate-600 hover:text-slate-900">
          Sign out
        </button>
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
