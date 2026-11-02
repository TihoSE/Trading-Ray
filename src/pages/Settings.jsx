import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getApiKey } from '../services/finnhub'

function ApiKeyForm() {
  const [key, setKey] = useState(() => (import.meta.env.PROD ? '' : getApiKey()))
  const [saved, setSaved] = useState(false)

  function handleSave(event) {
    event.preventDefault()
    if (key.trim()) {
      localStorage.setItem('finnhub_api_key', key.trim())
    } else {
      localStorage.removeItem('finnhub_api_key')
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  if (import.meta.env.PROD) {
    return (
      <section className="max-w-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Preferences</p>
        <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
        <p className="mt-4 rounded-2xl border border-line bg-panel p-5 text-sm text-muted">
          Live quotes use the market data key configured for this deployment. This deployment does
          not read or store a key in the browser.
        </p>
      </section>
    )
  }

  return (
    <section className="max-w-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Preferences</p>
      <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-muted">
        Store a market data key locally for development. If the key is missing or the request fails,
        the dashboard falls back to sample quotes.
      </p>

      <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-2xl border border-line bg-panel p-5">
        <label className="block text-sm font-medium">
          Market data key
          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="Optional · falls back to mock data"
            className="mt-2 w-full rounded-xl border border-line bg-[#070b14] px-3 py-2.5 text-sm outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"
        >
          Save key
        </button>
        {saved ? <p className="text-sm text-emerald-400">Saved. Reload the dashboard to fetch live quotes.</p> : null}
      </form>
    </section>
  )
}

export default function Settings() {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return (
      <section className="max-w-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Preferences</p>
        <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
        <p className="mt-4 rounded-2xl border border-line bg-panel p-5 text-sm text-muted">
          Only an admin can view or change the market data key.
        </p>
      </section>
    )
  }

  return <ApiKeyForm />
}
