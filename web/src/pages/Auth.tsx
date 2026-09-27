import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase.ts'
import { buttonClass, inputClass } from '../lib/ui.ts'

type Mode = 'signin' | 'signup' | 'forgot'

const titles = {
  signin: 'Sign in',
  signup: 'Create account',
  forgot: 'Reset password',
}

export default function Auth() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    if (mode === 'signin') {
      const result = await supabase.auth.signInWithPassword({ email, password })
      if (result.error) setError(result.error.message)
    }

    if (mode === 'signup') {
      const result = await supabase.auth.signUp({ email, password })
      if (result.error) setError(result.error.message)
      else if (!result.data.session) setNotice('Check your email to confirm your account.')
    }

    if (mode === 'forgot') {
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (result.error) setError(result.error.message)
      else setNotice('If an account uses that address, a reset link is on its way.')
    }

    setBusy(false)
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-lg font-semibold">{titles[mode]}</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {mode !== 'forgot' && (
            <input
              className={inputClass}
              type="password"
              placeholder="Password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-slate-600">{notice}</p>}
          <button className={`w-full ${buttonClass}`} disabled={busy}>
            {busy ? 'Please wait…' : titles[mode]}
          </button>
        </form>

        <div className="flex flex-col items-center gap-1 text-sm text-slate-500">
          {mode === 'signin' ? (
            <>
              <button type="button" onClick={() => switchMode('signup')} className="hover:text-slate-900">
                Create an account
              </button>
              <button type="button" onClick={() => switchMode('forgot')} className="hover:text-slate-900">
                Forgot password?
              </button>
            </>
          ) : (
            <button type="button" onClick={() => switchMode('signin')} className="hover:text-slate-900">
              Back to sign in
            </button>
          )}
          <Link to="/" className="pt-2 text-slate-400 hover:text-slate-900">
            ← Home
          </Link>
        </div>
      </div>
    </main>
  )
}
