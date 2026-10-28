import { useState } from 'react'
import { getApiKey } from '../services/finnhub'

export default function Settings() {
  const [key, setKey] = useState(() => getApiKey())
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

  return (
    <section className="max-w-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Preferences</p>
      <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-muted">
        Store a Finnhub token locally. If it is missing or the request fails, the dashboard falls back to mock quotes.
      </p>

      <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-2xl border border-line bg-panel p-5">
        <label className="block text-sm font-medium">
          Finnhub API key
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
