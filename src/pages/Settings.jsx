import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { getApiKey } from '../services/finnhub'

function ApiKeyForm() {
  const { t } = useLocale()
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
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{t('settings.kicker')}</p>
        <h1 className="mt-1 text-2xl font-semibold">{t('settings.title')}</h1>
        <p className="mt-4 rounded-2xl border border-line bg-panel p-5 text-sm text-muted">{t('settings.prod')}</p>
      </section>
    )
  }

  return (
    <section className="max-w-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{t('settings.kicker')}</p>
      <h1 className="mt-1 text-2xl font-semibold">{t('settings.title')}</h1>
      <p className="mt-2 text-sm text-muted">{t('settings.devHint')}</p>

      <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-2xl border border-line bg-panel p-5">
        <label className="block text-sm font-medium">
          {t('settings.key')}
          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder={t('settings.placeholder')}
            className="mt-2 w-full rounded-xl border border-line bg-[#070b14] px-3 py-2.5 text-sm outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"
        >
          {t('settings.save')}
        </button>
        {saved ? <p className="text-sm text-emerald-400">{t('settings.saved')}</p> : null}
      </form>
    </section>
  )
}

export default function Settings() {
  const { isAdmin } = useAuth()
  const { t } = useLocale()

  if (!isAdmin) {
    return (
      <section className="max-w-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{t('settings.kicker')}</p>
        <h1 className="mt-1 text-2xl font-semibold">{t('settings.title')}</h1>
        <p className="mt-4 rounded-2xl border border-line bg-panel p-5 text-sm text-muted">{t('settings.adminOnly')}</p>
      </section>
    )
  }

  return <ApiKeyForm />
}
