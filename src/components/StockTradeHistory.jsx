import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAccountPrompt } from '../context/AccountPromptContext'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { usePortfolio } from '../context/PortfolioContext'
import { formatCurrency, formatShares, formatSignedCurrency } from '../lib/money'
import { supabase } from '../lib/supabase'

function formatWhen(value, locale) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapTrade(row) {
  return {
    id: row.id,
    ticker: String(row.ticker).toUpperCase(),
    side: row.side,
    shares: Number(row.shares),
    price: Number(row.price),
    amount: Number(row.amount),
    realizedPnl: row.realized_pnl == null ? null : Number(row.realized_pnl),
    createdAt: row.created_at,
  }
}

export default function StockTradeHistory({ symbol }) {
  const { user } = useAuth()
  const { openAuth } = useAccountPrompt()
  const { locale, t } = useLocale()
  const { currency } = useCurrency()
  const { trades } = usePortfolio()
  const ticker = symbol.trim().toUpperCase()
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState(user ? 'loading' : 'ready')
  const newestTrade = trades.find((item) => item.ticker === ticker)?.id ?? trades[0]?.id ?? ''

  useEffect(() => {
    if (!user?.id) {
      setRows([])
      setStatus('ready')
      return undefined
    }

    let cancelled = false
    setStatus('loading')

    supabase
      .from('trades')
      .select('id, ticker, side, shares, price, amount, realized_pnl, created_at')
      .eq('user_id', user.id)
      .eq('ticker', ticker)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setRows([])
          setStatus('error')
          return
        }
        setRows((data ?? []).map(mapTrade))
        setStatus('ready')
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, ticker, newestTrade])

  return (
    <section className="mt-4" aria-labelledby="stock-history-tab">
      <div role="tablist" aria-label={t('history.tab')} className="grid grid-cols-1 rounded-xl border border-line bg-[#070b14] p-1">
        <button
          id="stock-history-tab"
          type="button"
          role="tab"
          aria-selected="true"
          className="rounded-lg bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          {t('history.tab')}
        </button>
      </div>
      <div role="tabpanel" aria-labelledby="stock-history-tab" className="mt-3">
        {!user ? (
          <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-6 text-center">
            <p className="text-sm text-muted">{t('history.guest')}</p>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="mt-3 rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-300"
            >
              {t('nav.login')}
            </button>
          </div>
        ) : status === 'loading' ? (
          <p className="text-sm text-muted">{t('history.loading')}</p>
        ) : status === 'error' ? (
          <p className="text-sm text-rose-300">{t('history.failed')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">{t('history.empty', { symbol: ticker })}</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
            {rows.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    <span className={item.side === 'buy' ? 'text-emerald-300' : 'text-rose-300'}>
                      {item.side === 'buy' ? t('portfolio.buy') : t('portfolio.sell')}
                    </span>{' '}
                    {formatShares(item.shares)}
                  </p>
                  <p className="text-xs text-muted">
                    {formatCurrency(item.price, currency)} · {formatWhen(item.createdAt, locale)}
                  </p>
                </div>
                <div className="text-right">
                  <p>{formatCurrency(item.amount, currency)}</p>
                  {item.realizedPnl != null ? (
                    <p className={`text-xs ${item.realizedPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {t('portfolio.realized', { amount: formatSignedCurrency(item.realizedPnl, currency) })}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
