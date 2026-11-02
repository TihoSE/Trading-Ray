import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccountPrompt } from '../context/AccountPromptContext'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { usePortfolio } from '../context/PortfolioContext'
import {
  STARTING_CASH,
  displayAmount,
  formatCurrency,
  formatShares,
  formatSignedCurrency,
  parseCash,
  usdFromDisplay,
} from '../lib/money'
import { fetchQuote, lookupName } from '../services/finnhub'

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

function CashEditor() {
  const { user } = useAuth()
  const { openPrompt } = useAccountPrompt()
  const { t } = useLocale()
  const { currency } = useCurrency()
  const { cash, ready, setPaperCash } = usePortfolio()
  const cap = formatCurrency(STARTING_CASH, currency, { digits: 0 })
  const zero = formatCurrency(0, currency, { digits: 0 })
  const [draft, setDraft] = useState(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState('ok')
  const shown = draft ?? (cash == null ? '' : String(displayAmount(cash, currency) ?? ''))

  useEffect(() => {
    setDraft(null)
  }, [currency])

  async function apply(next) {
    if (!user) {
      openPrompt()
      return
    }
    if (next > STARTING_CASH) {
      setTone('err')
      setMessage(t('portfolio.tooHigh', { cap }))
      return
    }
    setPending(true)
    setMessage('')
    try {
      await setPaperCash(next)
      setDraft(null)
      setTone('ok')
      setMessage(t('portfolio.updated'))
    } catch (error) {
      setTone('err')
      setMessage(error instanceof Error ? error.message : t('portfolio.updateFailed'))
    } finally {
      setPending(false)
    }
  }

  function applyDraft(event) {
    event.preventDefault()
    const parsed = parseCash(shown)
    const next = parsed == null ? null : usdFromDisplay(parsed, currency)
    if (next == null) {
      setTone('err')
      setMessage(t('portfolio.badAmount', { zero, cap }))
      return
    }
    void apply(next)
  }

  function addAmount(delta) {
    if (!user) {
      openPrompt()
      return
    }
    if (cash == null) return
    const next = Math.round((cash + delta) * 100) / 100
    void apply(next)
  }

  return (
    <form onSubmit={applyDraft} className="mt-4 rounded-2xl border border-line bg-panel p-5">
      <p className="text-sm font-semibold">{t('portfolio.adjustTitle')}</p>
      <p className="mt-1 text-sm text-muted">{t('portfolio.adjustBody', { cap })}</p>
      <label className="mt-4 block text-sm font-medium">
        {t('portfolio.balance')}
        <input
          type="text"
          inputMode="decimal"
          value={shown}
          onChange={(event) => setDraft(event.target.value)}
          disabled={Boolean(user) && (!ready || cash == null || pending)}
          className="mt-2 w-full rounded-xl border border-line bg-[#070b14] px-3 py-2.5 text-sm outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20 disabled:opacity-50"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={Boolean(user) && (!ready || cash == null || pending)}
          className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50"
        >
          {pending ? t('portfolio.saving') : t('portfolio.setBalance')}
        </button>
        <button
          type="button"
          onClick={() => addAmount(1000)}
          disabled={Boolean(user) && (!ready || cash == null || pending || cash + 1000 > STARTING_CASH)}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
        >
          {t('portfolio.add1000', { amount: formatCurrency(1000, currency, { digits: 0 }) })}
        </button>
        <button
          type="button"
          onClick={() => addAmount(10000)}
          disabled={Boolean(user) && (!ready || cash == null || pending || cash + 10000 > STARTING_CASH)}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
        >
          {t('portfolio.add10000', { amount: formatCurrency(10000, currency, { digits: 0 }) })}
        </button>
        <button
          type="button"
          onClick={() => apply(STARTING_CASH)}
          disabled={Boolean(user) && (!ready || cash == null || pending)}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
        >
          {t('portfolio.reset', { cap })}
        </button>
      </div>
      {message ? (
        <p className={`mt-3 text-sm ${tone === 'err' ? 'text-rose-300' : 'text-emerald-300'}`}>{message}</p>
      ) : null}
    </form>
  )
}

export default function Portfolio() {
  const { cash, funded, positions, trades, ready, error } = usePortfolio()
  const { locale, t } = useLocale()
  const { currency } = useCurrency()
  const [marks, setMarks] = useState({})
  const tickerKey = positions.map((position) => position.ticker).join(',')

  useEffect(() => {
    let cancelled = false
    const tickers = tickerKey ? tickerKey.split(',') : []

    async function loadMarks() {
      if (tickers.length === 0) {
        setMarks({})
        return
      }

      const entries = await Promise.all(
        tickers.map(async (ticker) => {
          try {
            const quote = await fetchQuote(ticker)
            return [ticker, quote.current]
          } catch {
            return [ticker, null]
          }
        }),
      )

      if (!cancelled) {
        setMarks(Object.fromEntries(entries))
      }
    }

    loadMarks()
    return () => {
      cancelled = true
    }
  }, [tickerKey])

  const rows = positions.map((position) => {
    const live = marks[position.ticker]
    const mark = live == null ? position.avgCost : live
    const marketValue = position.shares * mark
    const costBasis = position.shares * position.avgCost
    return {
      ...position,
      name: lookupName(position.ticker),
      mark,
      marketValue,
      unrealized: marketValue - costBasis,
      priced: live != null,
    }
  })

  const holdingsValue = rows.reduce((sum, row) => sum + row.marketValue, 0)
  const equity = (cash ?? 0) + holdingsValue
  const pnl = equity - funded
  const pnlPercent = funded > 0 ? (pnl / funded) * 100 : null
  const tone = pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'

  return (
    <section>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{t('portfolio.kicker')}</p>
      <h1 className="mt-1 text-2xl font-semibold">{t('portfolio.title')}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {t('portfolio.intro', { cash: formatCurrency(STARTING_CASH, currency) })}
      </p>

      {error ? (
        <p className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{t('portfolio.cash')}</p>
          <p className="mt-2 text-2xl font-semibold">{ready && cash != null ? formatCurrency(cash, currency) : '—'}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{t('portfolio.holdings')}</p>
          <p className="mt-2 text-2xl font-semibold">{ready ? formatCurrency(holdingsValue, currency) : '—'}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{t('portfolio.equity')}</p>
          <p className="mt-2 text-2xl font-semibold">{ready && cash != null ? formatCurrency(equity, currency) : '—'}</p>
          {ready && cash != null ? (
            <p className={`mt-2 text-sm font-medium ${tone}`}>
              {formatSignedCurrency(pnl, currency)}
              {pnlPercent == null ? '' : ` · ${pnl >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`}
            </p>
          ) : null}
        </article>
      </div>

      <CashEditor />

      <h2 className="mt-8 text-lg font-semibold">{t('portfolio.positions')}</h2>
      {!ready ? (
        <div className="mt-3 h-28 animate-pulse rounded-2xl border border-line bg-panel" />
      ) : positions.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-line bg-panel px-6 py-10 text-center">
          <p className="font-semibold">{t('portfolio.none')}</p>
          <p className="mt-2 text-sm text-muted">{t('portfolio.noneHint')}</p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"
          >
            {t('portfolio.back')}
          </Link>
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t('portfolio.ticker')}</th>
                <th className="px-4 py-3 font-medium">{t('portfolio.shares')}</th>
                <th className="px-4 py-3 font-medium">{t('portfolio.avg')}</th>
                <th className="px-4 py-3 font-medium">{t('portfolio.mark')}</th>
                <th className="px-4 py-3 font-medium">{t('portfolio.value')}</th>
                <th className="px-4 py-3 font-medium">{t('portfolio.unrealized')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ticker} className="border-t border-line bg-[#070b14]">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{row.ticker}</p>
                    <p className="text-xs text-muted">{row.name}</p>
                  </td>
                  <td className="px-4 py-3">{formatShares(row.shares)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.avgCost, currency)}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(row.mark, currency)}
                    {row.priced ? '' : <span className="ml-2 text-xs text-muted">{t('portfolio.cost')}</span>}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(row.marketValue, currency)}</td>
                  <td className={`px-4 py-3 ${row.unrealized >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {formatSignedCurrency(row.unrealized, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">{t('portfolio.trades')}</h2>
      {!ready || trades.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{ready ? t('portfolio.noTrades') : t('portfolio.loadingTrades')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {trades.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  <span className={item.side === 'buy' ? 'text-emerald-300' : 'text-rose-300'}>
                    {item.side === 'buy' ? t('portfolio.buy') : t('portfolio.sell')}
                  </span>{' '}
                  {formatShares(item.shares)} {item.ticker}
                </p>
                <p className="text-xs text-muted">{formatWhen(item.createdAt, locale)}</p>
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
    </section>
  )
}
