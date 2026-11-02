import { LayoutDashboard, LineChart, Settings, Wallet, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { usePortfolio } from '../context/PortfolioContext'
import { formatEur } from '../lib/money'

const links = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/watchlist', labelKey: 'nav.watchlist', icon: LineChart },
  { to: '/portfolio', labelKey: 'nav.portfolio', icon: Wallet },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const { t } = useLocale()
  useCurrency()
  const { cash, ready } = usePortfolio()
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label={t('sidebar.closeOverlay')}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-panel/95 backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/30">
              <LineChart size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-ink">Trading-Ray</p>
              <p className="text-xs text-muted">{t('sidebar.tagline')}</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-white/5 lg:hidden"
            onClick={onClose}
            aria-label={t('sidebar.close')}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sky-400/15 text-sky-200 ring-1 ring-sky-400/20'
                    : 'text-slate-300 hover:bg-white/5 hover:text-ink'
                }`
              }
            >
              <Icon size={18} />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="m-4 rounded-2xl border border-line bg-panel-2 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{t('sidebar.session')}</p>
          <p className="mt-2 text-sm text-ink">{t('sidebar.delayed')}</p>
          {user ? (
            <>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">{t('sidebar.paperCash')}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{ready && cash != null ? formatEur(cash) : '—'}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink">{t('sidebar.readOnly')}</p>
          )}
        </div>
      </aside>
    </>
  )
}
