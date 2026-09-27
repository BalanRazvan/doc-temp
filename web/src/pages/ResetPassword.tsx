import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { supabase } from '../lib/supabase.ts'
import { buttonClass, inputClass } from '../lib/ui.ts'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    const result = await supabase.auth.updateUser({ password })
    if (result.error) {
      setError(result.error.message)
    } else {
      setPassword('')
      setNotice('Password updated.')
    }

    setBusy(false)
  }

  return (
    <div className="w-full max-w-sm space-y-4 p-6">
      <h1 className="text-lg font-semibold">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className={inputClass}
          type="password"
          placeholder="New password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-slate-600">{notice}</p>}
        <button className={`w-full ${buttonClass}`} disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  )
}
