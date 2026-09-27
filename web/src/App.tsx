import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout.tsx'
import { supabase } from './lib/supabase.ts'
import Auth from './pages/Auth.tsx'
import Calendar from './pages/Calendar.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Landing from './pages/Landing.tsx'
import Patients from './pages/Patients.tsx'
import ProcedureSets from './pages/ProcedureSets.tsx'
import ResetPassword from './pages/ResetPassword.tsx'
import Studies from './pages/Studies.tsx'
import Timelines from './pages/Timelines.tsx'
import UserGuide from './pages/UserGuide.tsx'

type AuthStatus = 'checking' | 'signed-in' | 'signed-out'

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(session ? 'signed-in' : 'signed-out')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (authStatus === 'checking') {
    return <p className="p-6 text-sm text-slate-500">Loading…</p>
  }

  return (
    <BrowserRouter>
      <Routes>
        {authStatus === 'signed-in' ? (
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/timelines" element={<Timelines />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/procedure-sets" element={<ProcedureSets />} />
            <Route path="/studies" element={<Studies />} />
            <Route path="/guide" element={<UserGuide />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<Auth />} />
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
