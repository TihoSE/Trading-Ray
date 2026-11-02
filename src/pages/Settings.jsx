import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'

function MarketDataNote() {
  const { t } = useLocale()

  return (
    <section className="max-w-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{t('settings.kicker')}</p>
      <h1 className="mt-1 text-2xl font-semibold">{t('settings.title')}</h1>
      <p className="mt-4 rounded-2xl border border-line bg-panel p-5 text-sm text-muted">{t('settings.prod')}</p>
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

  return <MarketDataNote />
}
